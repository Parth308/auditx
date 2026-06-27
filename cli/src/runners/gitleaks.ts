import { execFile } from 'child_process';
import { promisify } from 'util';
import type { Finding, ScanResult } from '../types.js';
import { getBinaryPath } from '../installer.js';

const execFileAsync = promisify(execFile);

interface GitleaksFinding {
  Description: string;
  StartLine: number;
  EndLine: number;
  StartColumn: number;
  EndColumn: number;
  Match: string;
  Secret: string;
  File: string;
  SymlinkFile: string;
  Commit: string;
  Entropy: number;
  Author: string;
  Email: string;
  Date: string;
  Message: string;
  Tags: string[];
  RuleID: string;
  Fingerprint: string;
}

/**
 * Runs `gitleaks detect` against the target directory and parses its JSON output.
 * Gitleaks scans the git history when a .git folder is present.
 */
export async function runGitleaks(targetDir: string): Promise<ScanResult> {
  const start = Date.now();
  const scanner = 'gitleaks';

  try {
    const bin = await getBinaryPath('gitleaks');
    const { stdout } = await execFileAsync(
      bin,
      [
        'detect',
        '--source', targetDir,
        '--report-format', 'json',
        '--report-path', '/dev/stdout',
        '--no-banner',
        '--exit-code', '0', // Don't exit 1 on findings — we handle that ourselves
      ],
      { maxBuffer: 50 * 1024 * 1024 }, // 50 MB
    );

    const raw: GitleaksFinding[] = JSON.parse(stdout || '[]');

    const findings: Finding[] = raw.map((item) => ({
      id: '',
      category: 'SECRETS',
      severity: 'critical', // All secret findings default to critical
      title: item.Description || 'Hardcoded secret detected',
      file: item.File,
      line: item.StartLine,
      rule: item.RuleID,
      scanner,
      description: `Secret pattern matched: ${item.RuleID}`,
      match: item.Match ? redact(item.Match) : undefined,
      inGitHistory: !!item.Commit,
      fix: buildSecretFix(item),
    }));

    return { scanner, ok: true, findings, durationMs: Date.now() - start };
  } catch (err: any) {
    // gitleaks exits 1 when it finds secrets. Capture that output.
    if (err.stdout) {
      try {
        const raw: GitleaksFinding[] = JSON.parse(err.stdout || '[]');
        const findings: Finding[] = raw.map((item) => ({
          id: '',
          category: 'SECRETS',
          severity: 'critical',
          title: item.Description || 'Hardcoded secret detected',
          file: item.File,
          line: item.StartLine,
          rule: item.RuleID,
          scanner,
          description: `Secret pattern matched: ${item.RuleID}`,
          match: item.Match ? redact(item.Match) : undefined,
          inGitHistory: !!item.Commit,
          fix: buildSecretFix(item),
        }));
        return { scanner, ok: true, findings, durationMs: Date.now() - start };
      } catch {
        // fall through
      }
    }

    // gitleaks not installed or other failure
    if (err.code === 'ENOENT') {
      return {
        scanner,
        ok: false,
        findings: [],
        error: 'gitleaks not found. Install: https://github.com/gitleaks/gitleaks#installing',
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

/** Redacts secret value but keeps surrounding context for identification. */
function redact(match: string): string {
  // Replace anything that looks like a token/key with [REDACTED]
  return match.replace(/(['"`]?)([A-Za-z0-9+/=_\-]{12,})(['"`]?)/g, '$1[REDACTED]$3');
}

function buildSecretFix(item: GitleaksFinding): string {
  const lines = [
    'Remove from source code and add to .env file.',
    'Ensure .env is in .gitignore.',
  ];
  if (item.Commit) {
    lines.push(
      `This secret exists in git history (commit ${item.Commit.slice(0, 7)}). You must rotate the credential — removing it from code is not enough.`,
    );
  }
  return lines.join(' ');
}
