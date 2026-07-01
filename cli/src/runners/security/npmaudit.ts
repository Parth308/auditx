import { execFile } from 'child_process';
import { promisify } from 'util';
import type { Finding, ScanResult, Severity } from '../../types.js';

const execFileAsync = promisify(execFile);

// ─── npm audit JSON v2 types ──────────────────────────────────────────────────

interface NpmAuditVulnerability {
  name: string;
  severity: 'critical' | 'high' | 'moderate' | 'low' | 'info';
  isDirect: boolean;
  via: Array<string | NpmAuditVia>;
  effects: string[];
  range: string;
  nodes: string[];
  fixAvailable: boolean | { name: string; version: string; isSemVerMajor: boolean };
}

interface NpmAuditVia {
  source: number;
  name: string;
  dependency: string;
  title: string;
  url: string;
  severity: string;
  cvss: { score: number; vectorString: string };
  cwe: string[];
  range: string;
}

interface NpmAuditReport {
  auditReportVersion: number;
  vulnerabilities: Record<string, NpmAuditVulnerability>;
  metadata: {
    vulnerabilities: {
      info: number;
      low: number;
      moderate: number;
      high: number;
      critical: number;
      total: number;
    };
  };
}

// ─── Severity mapping ─────────────────────────────────────────────────────────

const NPM_SEV_MAP: Record<string, Severity> = {
  critical: 'critical',
  high: 'high',
  moderate: 'medium',
  low: 'low',
  info: 'info',
};

// ─── Runner ───────────────────────────────────────────────────────────────────

/**
 * Runs `npm audit --json` in the target directory and maps vulnerabilities
 * to normalized auditx findings.
 */
export async function runNpmAudit(targetDir: string): Promise<ScanResult> {
  const start = Date.now();
  const scanner = 'npm-audit';

  try {
    // npm audit exits with non-zero if vulnerabilities are found — capture stdout anyway
    const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const result = await execFileAsync(
      npmBin,
      ['audit', '--json'],
      { cwd: targetDir, maxBuffer: 20 * 1024 * 1024, shell: process.platform === 'win32' },
    ).catch((err) => {
      // npm audit exits 1 on findings, but stdout still has the JSON
      if (err.stdout) return { stdout: err.stdout as string };
      throw err;
    });

    const report: NpmAuditReport = JSON.parse(result.stdout || '{}');
    const findings: Finding[] = [];

    for (const [pkgName, vuln] of Object.entries(report.vulnerabilities ?? {})) {
      // Get details from the first "via" entry that's an object (not a string)
      const viaDetail = vuln.via.find((v): v is NpmAuditVia => typeof v === 'object');

      const cvss = viaDetail?.cvss?.score;
      const cve = viaDetail?.url?.includes('advisories')
        ? `GHSA-${viaDetail.url.split('/').pop()}`
        : undefined;

      const fixNote = typeof vuln.fixAvailable === 'object'
        ? `Run: npm install ${vuln.fixAvailable.name}@${vuln.fixAvailable.version}${vuln.fixAvailable.isSemVerMajor ? ' (MAJOR version bump)' : ''}`
        : vuln.fixAvailable
        ? 'Run: npm audit fix'
        : 'No automated fix available.';

      findings.push({
        id: '',
        category: 'DEPS',
        severity: NPM_SEV_MAP[vuln.severity] ?? 'info',
        title: viaDetail?.title ?? `Vulnerability in ${pkgName}`,
        rule: viaDetail?.url,
        scanner,
        description: `${pkgName} (${vuln.range}) — ${viaDetail?.title ?? vuln.severity}`,
        cve,
        cvss,
        packageName: pkgName,
        packageVersion: vuln.range,
        fix: fixNote,
      });
    }

    return { scanner, ok: true, findings, durationMs: Date.now() - start };
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return {
        scanner,
        ok: false,
        findings: [],
        error: 'npm not found.',
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
