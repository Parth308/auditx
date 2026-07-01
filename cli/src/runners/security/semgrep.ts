import { execFile } from 'child_process';
import { promisify } from 'util';
import type { Finding, ScanResult, Severity, StackInfo } from '../../types.js';
import { getBinaryPath, getSemgrepEnv } from '../../installer.js';

const execFileAsync = promisify(execFile);

// ─── Semgrep JSON output types ────────────────────────────────────────────────

interface SemgrepMatch {
  check_id: string;
  path: string;
  start: { line: number; col: number; offset: number };
  end: { line: number; col: number; offset: number };
  extra: {
    message: string;
    severity: 'ERROR' | 'WARNING' | 'INFO';
    metadata: {
      cwe?: string[];
      owasp?: string[];
      confidence?: string;
      impact?: string;
      likelihood?: string;
      category?: string;
      technology?: string[];
      references?: string[];
    };
    lines: string;
    fix?: string;
  };
}

interface SemgrepReport {
  results: SemgrepMatch[];
  errors: Array<{ level: string; message: string }>;
}

// ─── Severity mapping ─────────────────────────────────────────────────────────

function mapSemgrepSeverity(match: SemgrepMatch): Severity {
  const impact = match.extra.metadata.impact?.toLowerCase();
  const semSev = match.extra.severity;

  if (impact === 'high' || semSev === 'ERROR') return 'high';
  if (impact === 'medium' || semSev === 'WARNING') return 'medium';
  return 'low';
}

// ─── Runner ───────────────────────────────────────────────────────────────────

/**
 * Runs `semgrep` with the `p/security-audit` ruleset against the target
 * directory and returns normalized SAST findings.
 */
export async function runSemgrep(targetDir: string, stagedFiles: string[] | undefined, stack: StackInfo): Promise<ScanResult> {
  const start = Date.now();
  const scanner = 'semgrep';

  try {
    const bin = await getBinaryPath('semgrep');
    
    const configArgs = ['--config', 'p/security-audit'];
    if (stack.hasReact) configArgs.push('--config', 'p/react');
    if (stack.hasNextJs) configArgs.push('--config', 'p/nextjs');
    if (stack.hasNestJs) configArgs.push('--config', 'p/nestjs');
    if (stack.hasExpress) configArgs.push('--config', 'p/expressjs');
    if (stack.hasTypeScript) configArgs.push('--config', 'p/typescript');
    if (stack.hasPython) configArgs.push('--config', 'p/python');
    if (stack.hasDjango) configArgs.push('--config', 'p/django');
    if (stack.hasGo) configArgs.push('--config', 'p/golang');
    if (stack.hasSql) configArgs.push('--config', 'p/sql');

    const args = [
      'scan',
      ...configArgs,
      '--json',
      '--quiet',
      '--timeout', '30',
      '--no-rewrite-rule-ids',
      '--cache',
      '--exclude', 'node_modules',
      '--exclude', '.next',
      '--exclude', 'dist',
      '--exclude', 'build',
      '--exclude', '.git',
    ];
    if (stagedFiles && stagedFiles.length > 0) {
      args.push(...stagedFiles);
    } else {
      args.push(targetDir);
    }

    const { stdout } = await execFileAsync(
      bin,
      args,
      { maxBuffer: 50 * 1024 * 1024, env: getSemgrepEnv(), timeout: 120_000 },
    ).catch((err) => {
      // semgrep exits 1 when findings exist
      if (err.stdout) return { stdout: err.stdout as string };
      throw err;
    });

    const report: SemgrepReport = JSON.parse(stdout || '{"results":[]}');

    const findings: Finding[] = report.results.map((match) => ({
      id: '',
      category: 'SAST',
      severity: mapSemgrepSeverity(match),
      title: match.extra.message.split('\n')[0].slice(0, 120),
      file: match.path,
      line: match.start.line,
      rule: match.check_id,
      scanner,
      description: match.extra.message,
      fix: match.extra.fix,
      match: match.extra.lines?.trim().slice(0, 200),
    }));

    return { scanner, ok: true, findings, durationMs: Date.now() - start };
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return {
        scanner,
        ok: false,
        findings: [],
        error: 'semgrep not found. Install: https://semgrep.dev/docs/getting-started/',
        durationMs: Date.now() - start,
      };
    }
    return {
      scanner,
      ok: false,
      findings: [],
      error: String(err.message),
      durationMs: Date.now() - start,
    };
  }
}
