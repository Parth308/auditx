import chalk, { type ChalkInstance } from 'chalk';
import type { AuditReport, Finding, Severity, ScanResult } from '../types.js';

// ─── Color scheme ─────────────────────────────────────────────────────────────

const SEV_COLOR: Record<Severity, ChalkInstance> = {
  critical: chalk.bgRed.white.bold,
  high: chalk.red.bold,
  medium: chalk.yellow.bold,
  low: chalk.blue,
  info: chalk.gray,
};

const SEV_BADGE: Record<Severity, string> = {
  critical: chalk.bgRed.white(' CRITICAL '),
  high:     chalk.bgYellow.black(' HIGH     '),
  medium:   chalk.bgYellow.black(' MEDIUM   '),
  low:      chalk.bgBlue.white('  LOW      '),
  info:     chalk.bgGray.white('  INFO     '),
};

// ─── Scanner status display ───────────────────────────────────────────────────

/** Print a live scanner result line. Called by runner onProgress. */
export function printScannerResult(result: ScanResult): void {
  const icon = result.ok ? chalk.green('✓') : chalk.red('✗');
  const name = chalk.cyan(result.scanner.padEnd(18));
  const dur = chalk.gray(`${result.durationMs}ms`);
  const count = result.ok
    ? result.findings.length > 0
      ? chalk.yellow(`${result.findings.length} finding${result.findings.length !== 1 ? 's' : ''}`)
      : chalk.green('clean')
    : chalk.red(result.error ?? 'failed');

  console.log(`  ${icon} ${name} ${count}  ${dur}`);
}

// ─── Full report display ──────────────────────────────────────────────────────

/**
 * Prints the full auditx scan report to the terminal with colors.
 * Used for `--output terminal`.
 */
export function printTerminalReport(report: AuditReport): void {
  console.log('');
  console.log(chalk.bold.cyan('━'.repeat(60)));
  console.log(chalk.bold.cyan('  🛡️  auditx Security Report'));
  console.log(chalk.bold.cyan('━'.repeat(60)));
  console.log('');
  console.log(`  ${chalk.dim('Target:')}    ${chalk.white(report.meta.target)}`);
  console.log(`  ${chalk.dim('Scanned:')}   ${new Date(report.meta.scannedAt).toLocaleString()}`);
  console.log(`  ${chalk.dim('Duration:')}  ${(report.meta.durationMs / 1000).toFixed(1)}s`);
  console.log(`  ${chalk.dim('Stack:')}     ${chalk.cyan(report.meta.stack.join(' · ') || 'Unknown')}`);
  console.log(`  ${chalk.dim('Scanners:')} ${report.meta.scanners.join(', ')}`);
  console.log('');

  // Summary box
  const s = report.summary;
  console.log(chalk.bold('  Summary'));
  console.log(chalk.dim('  ' + '─'.repeat(40)));
  console.log(
    `  ${SEV_BADGE.critical}  ${chalk.white(String(s.critical).padStart(3))}` +
    `  ${SEV_BADGE.high}  ${chalk.white(String(s.high).padStart(3))}` +
    `  ${SEV_BADGE.medium}  ${chalk.white(String(s.medium).padStart(3))}` +
    `  ${SEV_BADGE.low}  ${chalk.white(String(s.low).padStart(3))}`,
  );
  console.log('');

  if (report.findings.length === 0) {
    console.log(chalk.green('  ✅ No findings. Clean scan.'));
    console.log('');
    return;
  }

  // Findings grouped by severity
  const severities: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

  for (const sev of severities) {
    const sevFindings = report.findings.filter((f) => f.severity === sev);
    if (sevFindings.length === 0) continue;

    console.log(SEV_COLOR[sev](`  ${sev.toUpperCase()} (${sevFindings.length})`));
    console.log('');

    for (const f of sevFindings) {
      printFinding(f);
    }
  }
}

function printFinding(f: Finding): void {
  console.log(`  ${chalk.bold(`[${f.category}]`)} ${f.title}`);
  if (f.file) {
    const loc = f.line ? `${f.file}:${f.line}` : f.file;
    console.log(`    ${chalk.dim('File:')} ${chalk.white(loc)}`);
  }
  if (f.cve) console.log(`    ${chalk.dim('CVE:')}  ${chalk.cyan(f.cve)}${f.cvss ? chalk.dim(` (CVSS ${f.cvss})`) : ''}`);
  if (f.rule) console.log(`    ${chalk.dim('Rule:')} ${chalk.gray(f.rule)}`);
  if (f.fix) console.log(`    ${chalk.dim('Fix:')}  ${chalk.green(f.fix)}`);
  if (f.inGitHistory) {
    console.log(`    ${chalk.red('⚠️  Found in git history — rotate this credential immediately!')}`);
  }
  console.log('');
}

// ─── Summary line (for CI output) ────────────────────────────────────────────

export function printCiSummary(report: AuditReport): void {
  const s = report.summary;
  const total = s.critical + s.high + s.medium + s.low + s.info;

  if (total === 0) {
    console.log(chalk.green('auditx: ✅ No security findings.'));
  } else {
    console.log(
      chalk.red(`auditx: ❌ ${total} findings`) +
        chalk.dim(
          ` — critical: ${s.critical}, high: ${s.high}, medium: ${s.medium}, low: ${s.low}`,
        ),
    );
  }
}
