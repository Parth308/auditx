import chalk, { type ChalkInstance } from 'chalk';
import type { AuditReport, Finding, Severity, ScanResult, StackInfo } from '../types.js';

const SEV_COLOR: Record<Severity, ChalkInstance> = {
  critical: chalk.bgRed.white.bold,
  high: chalk.red.bold,
  medium: chalk.yellow.bold,
  low: chalk.blue,
  info: chalk.dim,
};

// FIXED: chalk.bgGray doesn't exist in all chalk versions/terminals — use bgBlackBright
const SEV_BADGE: Record<Severity, string> = {
  critical: chalk.bgRed.white(' CRITICAL '),
  high: chalk.bgYellow.black(' HIGH     '),
  medium: chalk.bgYellow.black(' MEDIUM   '),
  low: chalk.bgBlue.white('  LOW      '),
  info: chalk.bgBlackBright.white('  INFO     '),
};

const MAX_FINDINGS_PER_SEVERITY = 15; // avoid flooding terminal on huge repos; full list still in --output json/markdown

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

export function printTerminalReport(report: AuditReport): void {
  console.log('');
  console.log(chalk.bold.cyan('━'.repeat(60)));
  console.log(chalk.bold.cyan('  [*]  auditx Security Report'));
  console.log(chalk.bold.cyan('━'.repeat(60)));
  console.log('');
  console.log(`  ${chalk.dim('Target:')}    ${chalk.white(report.meta.target)}`);
  console.log(`  ${chalk.dim('Scanned:')}   ${new Date(report.meta.scannedAt).toLocaleString()}`);
  console.log(`  ${chalk.dim('Duration:')}  ${(report.meta.durationMs / 1000).toFixed(1)}s`);
  console.log(`  ${chalk.dim('Stack:')}     ${chalk.cyan(report.meta.stack.join(' · ') || 'Unknown')}`);
  console.log(`  ${chalk.dim('Scanners:')} ${report.meta.scanners.join(', ')}`);
  console.log('');

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
    console.log(chalk.green('  [+] No findings. Clean scan.'));
    console.log('');
    return;
  }

  // Top offending files — fast triage view before wall of findings
  const fileCounts = new Map<string, number>();
  for (const f of report.findings) {
    if (!f.file) continue;
    fileCounts.set(f.file, (fileCounts.get(f.file) ?? 0) + 1);
  }
  if (fileCounts.size > 0) {
    console.log(chalk.bold('  Top affected files'));
    console.log(chalk.dim('  ' + '─'.repeat(40)));
    [...fileCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([file, count]) => {
        console.log(`  ${chalk.white(file)} ${chalk.dim(`(${count})`)}`);
      });
    console.log('');
  }

  const severities: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

  for (const sev of severities) {
    const sevFindings = report.findings.filter((f) => f.severity === sev);
    if (sevFindings.length === 0) continue;

    console.log(SEV_COLOR[sev](`  ${sev.toUpperCase()} (${sevFindings.length})`));
    console.log('');

    const shown = sevFindings.slice(0, MAX_FINDINGS_PER_SEVERITY);
    for (const f of shown) {
      printFinding(f);
    }

    const hidden = sevFindings.length - shown.length;
    if (hidden > 0) {
      console.log(chalk.dim(`  … and ${hidden} more ${sev} finding${hidden > 1 ? 's' : ''}. Run with --output markdown or --output json for full list.`));
      console.log('');
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
    console.log(`    ${chalk.red('[!]  Found in git history — rotate this credential immediately!')}`);
  }
  console.log('');
}

export function printCiSummary(report: AuditReport): void {
  const s = report.summary;
  const total = s.critical + s.high + s.medium + s.low + s.info;

  if (total === 0) {
    console.log(chalk.green('auditx: [+] No security findings.'));
  } else {
    console.log(
      chalk.red(`auditx: [-] ${total} findings`) +
      chalk.dim(` — critical: ${s.critical}, high: ${s.high}, medium: ${s.medium}, low: ${s.low}`),
    );
  }
}

function formatCell(text: string, colorFn: (s: string) => string, width: number): string {
  const padLeft = Math.floor((width - text.length) / 2);
  const padRight = width - text.length - padLeft;
  return ' '.repeat(padLeft) + colorFn(text) + ' '.repeat(padRight);
}

export function printSummaryTable(report: AuditReport, stack: StackInfo): void {
  const CATEGORY_MAP: Record<string, string> = {
    SECRETS: 'Secrets',
    DEPS: 'Dependencies',
    SAST: 'SAST',
    AI_CODE: 'AI Code Analysis',
    DUPLICATION: 'Code Duplication',
    DEP_HEALTH: 'Dependency Health',
    TYPE_SAFETY: 'Type Safety',
    GIT_HEALTH: 'Git Health',
    LICENSE: 'License Compliance',
    DEAD_CODE: 'Dead Code',
    IaC: 'IaC / Config',
    COMPLEXITY: 'Code Complexity',
    PATTERNS: 'Patterns',
    SUPPLY_CHAIN: 'Supply Chain',
    A11Y: 'Accessibility',
    COMPOUND: 'Compound Findings',
  };

  const categoriesToShow: string[] = [];
  for (const [catKey, catLabel] of Object.entries(CATEGORY_MAP)) {
    let app = true;
    if (catKey === 'SECRETS') app = stack.hasGit;
    else if (catKey === 'AI_CODE') app = stack.hasNodeJs || stack.hasTypeScript || stack.hasPython || stack.hasGo || stack.hasSql || stack.hasReact || stack.hasNextJs || stack.hasDjango || stack.hasExpress || stack.hasNestJs;
    else if (catKey === 'DEP_HEALTH') app = stack.hasNodeJs;
    else if (catKey === 'TYPE_SAFETY') app = stack.hasTypeScript;
    else if (catKey === 'GIT_HEALTH') app = stack.hasGit;
    else if (catKey === 'LICENSE') app = stack.hasNodeJs;
    else if (catKey === 'DEAD_CODE') app = stack.hasNodeJs;
    else if (catKey === 'IaC') app = stack.hasTerraform || stack.hasDocker || stack.hasGit;
    else if (catKey === 'SUPPLY_CHAIN') app = stack.hasNodeJs;
    else if (catKey === 'A11Y') app = stack.hasReact || stack.hasNextJs;
    
    if (app) {
      categoriesToShow.push(catKey);
    }
  }

  // Ensure any category with findings is included
  for (const f of report.findings) {
    if (f.category && !categoriesToShow.includes(f.category)) {
      categoriesToShow.push(f.category);
    }
  }

  // Row line builders
  const topBorder =    '┌' + '─'.repeat(23) + '┬' + ('─'.repeat(10) + '┬').repeat(4) + '─'.repeat(10) + '┐';
  const midBorder =    '├' + '─'.repeat(23) + '┼' + ('─'.repeat(10) + '┼').repeat(4) + '─'.repeat(10) + '┤';
  const bottomBorder = '└' + '─'.repeat(23) + '┴' + ('─'.repeat(10) + '┴').repeat(4) + '─'.repeat(10) + '┘';

  console.log('  ' + chalk.gray(topBorder));

  // Header row
  const catHeader = chalk.cyan(' Category'.padEnd(23));
  const critHeader = formatCell('Critical', chalk.red.bold, 10);
  const highHeader = formatCell('High', chalk.redBright.bold, 10);
  const medHeader = formatCell('Medium', chalk.yellow.bold, 10);
  const lowHeader = formatCell('Low', chalk.blue.bold, 10);
  const infoHeader = formatCell('Info', chalk.cyan.bold, 10);
  
  console.log(`  ${chalk.gray('│')}${catHeader}${chalk.gray('│')}${critHeader}${chalk.gray('│')}${highHeader}${chalk.gray('│')}${medHeader}${chalk.gray('│')}${lowHeader}${chalk.gray('│')}${infoHeader}${chalk.gray('│')}`);
  console.log('  ' + chalk.gray(midBorder));

  const severities: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

  for (const catKey of categoriesToShow) {
    const label = CATEGORY_MAP[catKey] || catKey;
    const catCell = chalk.cyan(` ${label}`.padEnd(23));
    const cells: string[] = [];

    for (const sev of severities) {
      if (catKey === 'DEAD_CODE' && (sev === 'critical' || sev === 'high')) {
        cells.push(formatCell('-', chalk.dim, 10));
        continue;
      }

      const count = report.findings.filter(f => f.category === catKey && f.severity === sev).length;
      
      let colorFn = chalk.dim;
      if (count > 0) {
        if (sev === 'critical') colorFn = chalk.red.bold;
        else if (sev === 'high') colorFn = chalk.redBright.bold;
        else if (sev === 'medium') colorFn = chalk.yellow.bold;
        else if (sev === 'low') colorFn = chalk.blue.bold;
        else if (sev === 'info') colorFn = chalk.cyan.bold;
      }
      
      cells.push(formatCell(String(count), colorFn, 10));
    }

    console.log(`  ${chalk.gray('│')}${catCell}${chalk.gray('│')}${cells.join(chalk.gray('│'))}${chalk.gray('│')}`);
  }

  console.log('  ' + chalk.gray(bottomBorder));
}

export function printSummaryStats(report: AuditReport): void {
  const s = report.summary;
  const summaryLine = [
    `🔴 ${chalk.red.bold(s.critical)} critical`,
    `🟠 ${chalk.redBright.bold(s.high)} high`,
    `🟡 ${chalk.yellow.bold(s.medium)} medium`,
    `🔵 ${chalk.blue.bold(s.low)} low`,
    `⚪ ${chalk.cyan.bold(s.info)} info`,
  ].join(chalk.gray('  •  '));
  
  console.log(`  ${summaryLine}`);
  console.log('');

  const urgentCount = s.critical + s.high;
  if (urgentCount > 0) {
    console.log(`  ${chalk.yellow.bold('⚠️')}  ${chalk.yellow.bold(urgentCount)} high severity findings need immediate attention.`);
    console.log('');
  }
}