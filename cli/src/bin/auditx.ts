#!/usr/bin/env node
import { program } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

import type { Config, Severity } from '../types.js';
import { detectStack, stackLabels } from '../detect.js';
import { runAll, getApplicableRunnerLabels } from '../runners/index.js';
import { aggregate, filterBySeverity, buildSummary } from '../aggregate.js';
import { formatMarkdown } from '../formatters/markdown.js';
import { formatJson } from '../formatters/json.js';
import { printTerminalReport, printCiSummary, printScannerResult } from '../formatters/terminal.js';
import { generateAiSummary } from '../ai.js';
import { getBinaryPath, type ToolName } from '../installer.js';
import { promptForAiConfig, readGlobalConfig } from '../config.js';
import type { AiProvider } from '../types.js';

// ─── Package version ──────────────────────────────────────────────────────────
// Injected by tsup at build time via --define
declare const __VERSION__: string;
const VERSION = (typeof __VERSION__ !== 'undefined') ? __VERSION__ : '0.1.0';

// ─── CLI definition ───────────────────────────────────────────────────────────

program
  .name('auditx')
  .description('One command. Every vulnerability. AI-ready markdown report.')
  .version(VERSION, '-v, --version')
  .argument('[target]', 'Directory to scan', '.')
  .option(
    '-o, --output <mode>',
    'Output mode: markdown (default), json, terminal',
    'markdown',
  )
  .option(
    '--output-file <path>',
    'Path for the markdown report file',
    'audit-report.md',
  )
  .option(
    '--severity <level>',
    'Minimum severity to include: critical | high | medium | low | info',
    'info',
  )
  .option(
    '--skip <categories>',
    'Comma-separated list of categories to skip: secrets,deps,sast,deadcode,iac,patterns',
    '',
  )
  .option('--ci', 'Exit with code 1 if any findings exist (for CI pipelines)')
  .option('--ai', 'Append AI analysis block to the report')
  .option('--ai-provider <provider>', 'AI provider: gemini | openai | claude')
  .option('--ai-model <model>', 'Specific model override (optional)')
  .option('--fix', 'Auto-apply fixable issues (eslint --fix, knip --fix)')
  .option('--watch', 'Re-run on file changes (dev mode)')
  .option('--check-deps', 'Verify all required external scanner tools are installed');

program.parse();

// ─── Main ─────────────────────────────────────────────────────────────────────

const opts = program.opts();
const [targetArg = '.'] = program.args;

// Special "install" command
if (targetArg === 'install') {
  console.log(chalk.cyan('\n  Pre-fetching all external scanners...\n'));
  try {
    await getBinaryPath('gitleaks');
    await getBinaryPath('trivy');
    await getBinaryPath('semgrep');
    console.log(chalk.green('\n  ✅ All scanners installed successfully.\n'));
  } catch (err: any) {
    console.error(chalk.red(`\n  ❌ Installation failed: ${err.message}\n`));
    process.exit(1);
  }
  process.exit(0);
}

const config: Config = {
  target: resolve(targetArg),
  output: (opts['output'] as Config['output']) ?? 'markdown',
  outputFile: opts['outputFile'] ?? 'audit-report.md',
  severity: (opts['severity'] as Severity) ?? 'info',
  skip: opts['skip']
    ? (opts['skip'] as string).split(',').map((s: string) => s.trim()).filter(Boolean) as Config['skip']
    : [],
  ci: Boolean(opts['ci']),
  ai: Boolean(opts['ai']),
  aiProvider: opts['aiProvider'] as AiProvider,
  aiModel: opts['aiModel'] as string,
  fix: Boolean(opts['fix']),
  watch: Boolean(opts['watch']),
  checkDeps: Boolean(opts['checkDeps']),
};

// ─── --check-deps ─────────────────────────────────────────────────────────────

if (config.checkDeps) {
  await checkDependencies();
  process.exit(0);
}

// ─── --watch mode ─────────────────────────────────────────────────────────────

if (config.watch) {
  console.log(chalk.cyan('👁  Watch mode enabled. Press Ctrl+C to stop.\n'));
  await runScan();

  // Use chokidar-style polling via a simple loop
  const { watch } = await import('fs');
  watch(config.target, { recursive: true }, async (event, filename) => {
    if (filename?.endsWith('.md') || filename?.includes('node_modules')) return;
    console.log(chalk.dim(`\n[${new Date().toLocaleTimeString()}] File changed: ${filename}. Re-scanning…\n`));
    await runScan();
  });

  // Keep process alive
  process.stdin.resume();
} else {
  await runScan();
}

// ─── Core scan function ───────────────────────────────────────────────────────

async function runScan(): Promise<void> {
  const scanStart = Date.now();

  console.log('');
  console.log(chalk.bold.cyan('  🛡️  auditx') + chalk.dim(` v${VERSION}`));
  console.log(chalk.dim(`  Scanning: ${config.target}`));
  console.log('');

  if (config.ai && !config.aiProvider) {
    const globalConfig = readGlobalConfig();
    if (!globalConfig.aiProvider) {
      console.log(chalk.cyan('  🤖 First time using --ai. Let\'s set up your provider!'));
      await promptForAiConfig();
      const updatedConfig = readGlobalConfig();
      config.aiProvider = updatedConfig.aiProvider;
      if (!config.aiModel && updatedConfig.aiModel) config.aiModel = updatedConfig.aiModel;
    } else {
      config.aiProvider = globalConfig.aiProvider;
      if (!config.aiModel && globalConfig.aiModel) config.aiModel = globalConfig.aiModel;
    }
  }

  // 1. Detect stack
  const stack = detectStack(config.target);
  const labels = stackLabels(stack);

  if (labels.length === 0) {
    console.log(chalk.yellow('  ⚠️  No recognized stack detected. Running generic scanners only.'));
  } else {
    console.log(chalk.dim(`  Stack detected: ${chalk.cyan(labels.join(' · '))}`));
  }

  const applicableRunners = getApplicableRunnerLabels(stack, config);
  console.log(chalk.dim(`  Running ${applicableRunners.length} scanners in parallel…`));
  console.log('');

  // 2. Run all scanners in parallel with live progress
  const spinner = ora({ text: 'Scanning…', color: 'cyan' }).start();

  const results = await runAll(config.target, stack, config, (progress) => {
    spinner.stop();
    printScannerResult({
      scanner: progress.label,
      ok: progress.status === 'done',
      findings: [],
      error: progress.error,
      durationMs: progress.durationMs ?? 0,
    });
    spinner.start();
  });

  spinner.stop();

  const totalDuration = Date.now() - scanStart;

  // 3. Aggregate findings
  let findings = aggregate(results);

  // 4. Apply severity filter
  findings = filterBySeverity(findings, config.severity);

  // 5. Build report
  const report = {
    meta: {
      target: config.target,
      scannedAt: new Date().toISOString(),
      durationMs: totalDuration,
      stack: labels,
      scanners: results.filter((r) => r.ok).map((r) => r.scanner),
    },
    summary: buildSummary(findings),
    findings,
  };

  // 6. AI summary (optional)
  let aiSummary: string | undefined;
  if (config.ai) {
    const aiSpinner = ora(`Analyzing findings with ${config.aiProvider || 'AI'}…`).start();
    try {
      aiSummary = await generateAiSummary(report, config.aiProvider, config.aiModel);
      aiSpinner.succeed('AI analysis complete');
    } catch (err) {
      aiSpinner.fail(`AI analysis failed: ${String(err)}`);
    }
  }

  // 7. Output
  switch (config.output) {
    case 'markdown': {
      const md = formatMarkdown(report, aiSummary);
      writeFileSync(config.outputFile, md, 'utf8');
      console.log('');
      console.log(chalk.green(`  ✅ Report written to: ${chalk.bold(config.outputFile)}`));
      printCiSummary(report);
      break;
    }

    case 'json': {
      const json = formatJson(report);
      writeFileSync(config.outputFile.replace('.md', '.json'), json, 'utf8');
      console.log(json);
      break;
    }

    case 'terminal': {
      printTerminalReport(report);
      break;
    }
  }

  // 8. --fix
  if (config.fix) {
    applyFixes(config.target);
  }

  // 9. --ci exit code
  const urgentFindings = findings.filter(
    (f) => f.severity === 'critical' || f.severity === 'high',
  );

  if (config.ci && urgentFindings.length > 0) {
    console.log(
      chalk.red(`\n  ❌ CI mode: ${urgentFindings.length} critical/high finding(s). Exiting with code 1.`),
    );
    process.exit(1);
  } else if (config.ci) {
    console.log(chalk.green('\n  ✅ CI mode: No critical/high findings. Clean!'));
  }
}

// ─── --check-deps ─────────────────────────────────────────────────────────────

async function checkDependencies(): Promise<void> {
  console.log(chalk.bold('\n  auditx — Dependency Check\n'));

  const tools: Array<{ name: ToolName; checkArgs: string[] }> = [
    { name: 'gitleaks', checkArgs: ['version'] },
    { name: 'trivy', checkArgs: ['--version'] },
    { name: 'semgrep', checkArgs: ['--version'] },
  ];

  for (const tool of tools) {
    try {
      const bin = await getBinaryPath(tool.name);
      execSync(`"${bin}" ${tool.checkArgs.join(' ')}`, { stdio: 'ignore' });
      console.log(`  ${chalk.green('✓')} ${tool.name.padEnd(12)} ${chalk.green('installed')}`);
    } catch {
      console.log(
        `  ${chalk.red('✗')} ${tool.name.padEnd(12)} ${chalk.red('not found')} — will be auto-installed on first run`,
      );
    }
  }

  // Also check npm
  try {
    execSync('npm --version', { stdio: 'ignore' });
    console.log(`  ${chalk.green('✓')} ${'npm'.padEnd(12)} ${chalk.green('installed')}`);
  } catch {
    console.log(`  ${chalk.red('✗')} ${'npm'.padEnd(12)} ${chalk.red('not found')}`);
  }

  console.log('');
}

// ─── --fix ────────────────────────────────────────────────────────────────────

function applyFixes(targetDir: string): void {
  console.log(chalk.cyan('\n  🔧 Applying auto-fixes…\n'));

  try {
    execSync('npx eslint --fix .', { cwd: targetDir, stdio: 'inherit' });
    console.log(chalk.green('  ✓ eslint --fix applied'));
  } catch {
    console.log(chalk.yellow('  ⚠ eslint --fix had issues (see above)'));
  }
}
