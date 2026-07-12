import ora from 'ora';
import chalk from 'chalk';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { resolve, join } from 'path';

import type { Config } from '../types.js';
import { detectStack, stackLabels } from '../detect.js';
import { runAll, getApplicableRunnerLabels } from '../runners/index.js';
import { aggregate, filterBaselines, filterBySeverity, buildSummary } from '../aggregate.js';
import { formatMarkdown } from '../formatters/markdown.js';
import { formatJson } from '../formatters/json.js';
import { formatAgent } from '../formatters/agent.js';
import { formatSarif } from '../formatters/sarif.js';
import { formatHtml } from '../formatters/html.js';
import { printTerminalReport, printCiSummary, printScannerResult } from '../formatters/terminal.js';
import { generateAiSummary } from '../ai.js';
import { promptForAiConfig, readGlobalConfig } from '../config.js';
import { applyFixes } from './fix.js';
import { generateSbom } from './sbom.js';
import { CacheManager } from '../cache.js';

async function doCoreScan(config: Config, VERSION: string): Promise<void> {
  const scanStart = Date.now();

  const isInteractive = config.output !== 'json' && config.output !== 'agent';

  if (isInteractive) {
    console.log('');
    console.log(chalk.bold.cyan('  [*]  auditx') + chalk.dim(` v${VERSION}`));
    console.log(chalk.dim(`  Scanning: ${config.target}`));
    console.log('');
  }

  if (config.ai && !config.aiProvider) {
    await setupAiConfig(config, isInteractive);
  }

  // 1. Detect stack
  const stack = detectStack(config.target);
  const labels = stackLabels(stack);

  if (isInteractive) {
    if (labels.length === 0) {
      console.log(chalk.yellow('  [!]  No recognized stack detected. Running generic scanners only.'));
    } else {
      console.log(chalk.dim(`  Stack detected: ${chalk.cyan(labels.join(' · '))}`));
    }
  }

  const applicableRunners = getApplicableRunnerLabels(stack, config);
  if (isInteractive) {
    if (existsSync(join(config.target, 'auditx.yml'))) {
      console.log(chalk.cyan(`  Custom rules: `) + chalk.dim(join(config.target, 'auditx.yml')));
    }
    if (config.baseline && existsSync(join(config.target, config.baseline))) {
      console.log(chalk.cyan(`  Baseline loaded: `) + chalk.dim(join(config.target, config.baseline)));
    }
    console.log(chalk.dim(`  Running ${applicableRunners.length} scanners in parallel…`));
    console.log('');
  }

  // 1.5 Cache layer
  const cacheManager = new CacheManager(config.target);
  let results = null;

  if (!config.noCache && !config.stagedFiles) {
    const cachedResults = await cacheManager.loadCache(config.target, VERSION, config);
    if (cachedResults) {
      if (isInteractive) console.log(chalk.green(`  ✓  loaded from cache (0ms)`));
      results = cachedResults;
    }
  }

  // 2. Run all scanners in parallel with live progress
  if (!results) {
    const spinner = isInteractive ? ora({ text: 'Scanning…', color: 'cyan' }).start() : undefined;

    results = await runAll(config.target, stack, config, (progress) => {
      if (isInteractive) {
        spinner?.stop();
        printScannerResult({
          scanner: progress.label,
          ok: progress.status === 'done',
          findings: [],
          error: progress.error,
          durationMs: progress.durationMs ?? 0,
        });
        spinner?.start();
      }
    });

    if (isInteractive) spinner?.stop();

    if (!config.noCache && !config.stagedFiles) {
      await cacheManager.saveCache(config.target, VERSION, config, results);
    }
  }

  const totalDuration = Date.now() - scanStart;

  // 3. Aggregate findings
  let findings = aggregate(results, config.target);

  // 3.5. Baseline logic
  if (config.generateBaseline) {
    await handleBaselineGeneration(config, findings, isInteractive);
  } else if (config.baseline) {
    findings = filterWithBaseline(config, findings, isInteractive);
  }

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
  const aiSummary = await handleAiSummary(config, report);

  // 7. Output
  handleOutput(config, report, aiSummary, isInteractive);

  // 8. --fix
  if (config.fix) {
    await applyFixes(config.target);
  }

  // 8.5 --sbom
  if (config.sbom) {
    await generateSbom(config.target, isInteractive);
  }

  // 9. --ci exit code
  const urgentFindings = findings.filter(
    (f) => f.severity === 'critical' || f.severity === 'high',
  );

  if (config.ci && urgentFindings.length > 0) {
    if (isInteractive) {
      console.log(
        chalk.red(`\n  [-] CI mode: ${urgentFindings.length} critical/high finding(s). Exiting with code 1.`),
      );
    }
    process.exit(1);
  } else if (config.ci) {
    if (isInteractive) console.log(chalk.green('\n  [+] CI mode: No critical/high findings. Clean!'));
  }
}

export async function runScanCommand(opts: Record<string, any>, targetArg: string, VERSION: string): Promise<void> {
  let stagedFiles: string[] | undefined = undefined;
  if (opts['stagedList']) {
    try {
      const content = readFileSync(opts['stagedList'], 'utf8').replace(/\0/g, '');
      const files = content.split('\n').map((s) => s.trim()).filter(Boolean);
      
      const globalConfigs = ['package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'tsconfig.json', '.eslintrc', 'go.mod', 'requirements.txt', 'schema.prisma'];
      const touchedGlobal = files.some(f => globalConfigs.some(g => f.endsWith(g)) || f.endsWith('.yml') || f.endsWith('.yaml'));
      
      if (touchedGlobal) {
        console.log(chalk.yellow('\n  [!]  Global configuration files modified. Ignoring --staged-list and performing a full scan.'));
        stagedFiles = undefined;
      } else {
        stagedFiles = files;
      }
    } catch (err: any) {
      console.error(chalk.red(`\n  [-] Failed to read staged-list file: ${err.message}\n`));
      process.exit(1);
    }
  }

  if (!stagedFiles) {
    try {
      const { execSync } = await import('child_process');
      const output = execSync('git ls-files', { cwd: resolve(targetArg), encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      const files = output.split('\n').map(s => s.trim()).filter(Boolean);
      if (files.length > 0) {
        stagedFiles = files.map(f => resolve(targetArg, f));
      }
    } catch {
      stagedFiles = undefined;
    }
  }

  const config: Config = {
    target: resolve(targetArg),
    output: (opts['output'] as Config['output']) ?? 'markdown',
    outputFile: opts['outputFile'] ?? 'audit-report.md',
    severity: (opts['severity'] as any) ?? 'info',
    skip: opts['skip']
      ? (opts['skip'] as string).split(',').map((s: string) => s.trim()).filter(Boolean) as any
      : [],
    only: opts['only']
      ? (opts['only'] as string).split(',').map((s: string) => s.trim()).filter(Boolean) as any
      : undefined,
    stagedFiles,
    ci: Boolean(opts['ci']),
    ai: Boolean(opts['ai']),
    aiProvider: opts['aiProvider'] as any,
    aiModel: opts['aiModel'] as string,
    fix: Boolean(opts['fix']),
    sbom: Boolean(opts['sbom']),
    watch: Boolean(opts['watch']),
    checkDeps: Boolean(opts['checkDeps']),
    generateBaseline: Boolean(opts['generateBaseline']),
    baseline: opts['baseline'] as string,
    noCache: Boolean(opts['noCache']),
    instruct: Boolean(opts['instruct']),
  };

  if (config.checkDeps) {
    const { checkDependencies } = await import('./check-deps.js');
    await checkDependencies();
    process.exit(0);
  }

  if (config.watch) {
    console.log(chalk.cyan('  [i] Watch mode enabled. Press Ctrl+C to stop.\n'));
    await doCoreScan(config, VERSION);

    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    const DEBOUNCE_MS = 500;

    const { watch } = await import('fs');
    watch(config.target, { recursive: true }, (event, filename) => {
      if (filename?.endsWith('.md') || filename?.includes('node_modules')) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        console.log(chalk.dim(`\n[${new Date().toLocaleTimeString()}] File changed: ${filename}. Re-scanning…\n`));
        await doCoreScan(config, VERSION);
      }, DEBOUNCE_MS);
    });

    process.stdin.resume();
  } else {
    await doCoreScan(config, VERSION);
  }
}

async function setupAiConfig(config: Config, isInteractive: boolean) {
  const globalConfig = readGlobalConfig();
  if (!globalConfig.aiProvider) {
    if (isInteractive) console.log(chalk.cyan('  [ai] First time using --ai. Let\'s set up your provider!'));
    await promptForAiConfig();
    const updatedConfig = readGlobalConfig();
    config.aiProvider = updatedConfig.aiProvider;
    if (!config.aiModel && updatedConfig.aiModel) config.aiModel = updatedConfig.aiModel;
  } else {
    config.aiProvider = globalConfig.aiProvider;
    if (!config.aiModel && globalConfig.aiModel) config.aiModel = globalConfig.aiModel;
  }
}

async function handleBaselineGeneration(config: Config, findings: any[], isInteractive: boolean) {
  const { relative, isAbsolute } = await import('path');
  const baselineFile = join(config.target, config.baseline ?? '.auditxignore');
  const suppressions = findings.map(f => {
    let relFile = f.file;
    if (relFile && isAbsolute(relFile)) {
      relFile = relative(config.target, relFile).replace(/\\/g, '/');
    } else if (relFile) {
      relFile = relFile.replace(/\\/g, '/');
    }
    return { rule: f.rule, file: relFile, title: f.title };
  });
  const baselineObj = { version: 1, suppressions };
  writeFileSync(baselineFile, JSON.stringify(baselineObj, null, 2), 'utf8');
  
  if (isInteractive) {
    console.log(chalk.green(`\n  [+] Baseline generated with ${findings.length} findings: ${baselineFile}`));
    console.log(chalk.dim(`      Future runs will ignore these existing findings unless they change.`));
  }
  process.exit(0);
}

function filterWithBaseline(config: Config, findings: any[], isInteractive: boolean) {
  const baselineFile = join(config.target, config.baseline!);
  if (existsSync(baselineFile)) {
    const beforeCount = findings.length;
    const filtered = filterBaselines(findings, baselineFile);
    const suppressedCount = beforeCount - filtered.length;
    if (isInteractive && suppressedCount > 0) {
      console.log(chalk.dim(`\n  [i] Suppressed ${suppressedCount} findings using baseline.`));
    }
    return filtered;
  }
  return findings;
}

async function handleAiSummary(config: Config, report: any): Promise<string | undefined> {
  if (!config.ai) return undefined;
  const aiSpinner = ora(`Analyzing findings with ${config.aiProvider || 'AI'}…`).start();
  try {
    const summary = await generateAiSummary(report, config.aiProvider, config.aiModel);
    aiSpinner.succeed('AI analysis complete');
    return summary;
  } catch (err) {
    aiSpinner.fail(`AI analysis failed: ${String(err)}`);
    return undefined;
  }
}

function handleOutput(config: Config, report: any, aiSummary: string | undefined, isInteractive: boolean) {
  switch (config.output) {
    case 'markdown': {
      const md = formatMarkdown(report, aiSummary);
      writeFileSync(config.outputFile, md, 'utf8');
      console.log('');
      console.log(chalk.green(`  [+] Report written to: ${chalk.bold(config.outputFile)}`));
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
    case 'agent': {
      console.log(formatAgent(report, config));
      break;
    }
    case 'sarif': {
      const sarif = formatSarif(report);
      const outFile = config.outputFile.replace('.md', '.sarif');
      writeFileSync(outFile, sarif, 'utf8');
      if (isInteractive) {
        console.log(chalk.green(`  [+] SARIF report written to: ${chalk.bold(outFile)}`));
      } else {
        console.log(sarif);
      }
      break;
    }
    case 'html': {
      const html = formatHtml(report, aiSummary);
      const outFile = config.outputFile.endsWith('.md') 
        ? config.outputFile.replace(/\.md$/, '.html')
        : `${config.outputFile}.html`;
      writeFileSync(outFile, html, 'utf8');
      console.log('');
      console.log(chalk.green(`  [+] HTML report written to: ${chalk.bold(outFile)}`));
      printCiSummary(report);
      break;
    }
  }
}

