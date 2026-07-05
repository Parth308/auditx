#!/usr/bin/env node

// Silence Node.js deprecation warnings (e.g. DEP0190 for shell:true with array args)
process.noDeprecation = true;

import { program } from 'commander';
import chalk from 'chalk';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// ─── Package version ──────────────────────────────────────────────────────────
// Injected by tsup at build time via --define
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkgPath = existsSync(join(__dirname, '../package.json')) 
  ? join(__dirname, '../package.json') 
  : join(__dirname, '../../package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
const VERSION = pkg.version;

// ─── CLI definition ───────────────────────────────────────────────────────────

program
  .name('auditx')
  .description('One command. Every vulnerability. AI-ready markdown report.')
  .version(VERSION, '-v, --version')
  .argument('[target]', 'Directory to scan, or "init-agent" to generate AI files', '.')
  .option(
    '-o, --output <mode>',
    'Output mode: markdown (default), json, terminal, agent',
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
    'Comma-separated list of categories to skip: secrets,deps,sast,deadcode,iac,patterns,duplication,complexity,dephealth,license,aicode,githealth,typesafety',
    '',
  )
  .option('--ci', 'Exit with code 1 if any findings exist (for CI pipelines)')
  .option('--ai', 'Append AI analysis block to the report')
  .option('--ai-provider <provider>', 'AI provider: gemini | openai | claude')
  .option('--ai-model <model>', 'Specific model override (optional)')
  .option('--staged-list <file>', 'Path to a file containing a list of files to scan (used by git hooks)')
  .option('--fix', 'Auto-apply fixable issues (eslint --fix, knip --fix)')
  .option('--generate-baseline', 'create .auditxignore with current findings')
  .option('--baseline <path>', 'path to baseline file', '.auditxignore')
  .option('--sbom', 'Generate a CycloneDX SBOM file (sbom.json)')
  .option('--watch', 'Re-run on file changes (dev mode)')
  .option('--check-deps', 'Verify all required external scanner tools are installed')
  .option('--help-json', 'Output command reference as JSON (for AI agents)');

program.parse();

// ─── Main ─────────────────────────────────────────────────────────────────────

const opts = program.opts();
const [targetArg = '.'] = program.args;

if (opts['helpJson']) {
  const options = program.options.map(opt => ({
    flags: opt.flags,
    description: opt.description,
    defaultValue: opt.defaultValue
  }));
  console.log(JSON.stringify({ options }, null, 2));
  process.exit(0);
}

// Map subcommands to their newly extracted modules
if (targetArg === 'install') {
  import('../commands/install.js').then((m) => m.runInstallCommand());
} else if (targetArg === 'init-agent') {
  import('../commands/init.js').then((m) => m.runInitAgentCommand());
} else if (targetArg === 'init-rule') {
  import('../commands/init.js').then((m) => m.runInitRuleCommand());
} else if (targetArg === 'hook') {
  import('../commands/hook.js').then((m) => m.runHookCommand(program.args, opts));
} else {
  // Default scan path
  import('../commands/scan.js').then((m) => m.runScanCommand(opts, targetArg, VERSION));
}
