import { execFile } from 'child_process';
import { promisify } from 'util';
import type { Finding, ScanResult, Severity } from '../types.js';
import { getBinaryPath } from '../installer.js';

const execFileAsync = promisify(execFile);

// ─── Trivy JSON output types (simplified) ────────────────────────────────────

interface TrivyVulnerability {
  VulnerabilityID: string;
  PkgName: string;
  InstalledVersion: string;
  FixedVersion: string;
  Title: string;
  Description: string;
  Severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  CVSS?: {
    nvd?: { V3Score?: number; V2Score?: number };
    redhat?: { V3Score?: number };
  };
  References: string[];
  PrimaryURL: string;
}

interface TrivyMisconfiguration {
  Type: string;
  ID: string;
  Title: string;
  Description: string;
  Message: string;
  Severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  Resolution: string;
  Status: string;
}

interface TrivyResult {
  Target: string;
  Class: 'os-pkgs' | 'lang-pkgs' | 'config';
  Type: string;
  Vulnerabilities?: TrivyVulnerability[];
  Misconfigurations?: TrivyMisconfiguration[];
}

interface TrivyReport {
  SchemaVersion: number;
  Results: TrivyResult[];
}

// ─── Severity mapping ─────────────────────────────────────────────────────────

const TRIVY_SEV_MAP: Record<string, Severity> = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  UNKNOWN: 'info',
};

// ─── Runner ───────────────────────────────────────────────────────────────────

/**
 * Runs `trivy fs` (dependency scan) and `trivy config` (IaC scan) against the
 * target directory. Returns normalized findings for both DEPS and IaC categories.
 */
export async function runTrivy(targetDir: string): Promise<ScanResult> {
  const start = Date.now();
  const scanner = 'trivy';

  const [fsResult, configResult] = await Promise.allSettled([
    runTrivyFs(targetDir),
    runTrivyConfig(targetDir),
  ]);

  const findings: Finding[] = [];

  if (fsResult.status === 'fulfilled') {
    findings.push(...fsResult.value);
  }
  if (configResult.status === 'fulfilled') {
    findings.push(...configResult.value);
  }

  // If both failed we consider it a failure
  const ok = fsResult.status === 'fulfilled' || configResult.status === 'fulfilled';
  const error =
    !ok
      ? 'trivy not found. Install: https://trivy.dev/docs/getting-started/installation/'
      : undefined;

  return { scanner, ok, findings, error, durationMs: Date.now() - start };
}

async function runTrivyFs(targetDir: string): Promise<Finding[]> {
  const bin = await getBinaryPath('trivy');
  const { stdout } = await execFileAsync(
    bin,
    [
      'fs',
      '--format', 'json',
      '--quiet',
      '--scanners', 'vuln',
      targetDir,
    ],
    { maxBuffer: 50 * 1024 * 1024 },
  );

  const report: TrivyReport = JSON.parse(stdout || '{}');
  const findings: Finding[] = [];

  for (const result of report.Results ?? []) {
    for (const vuln of result.Vulnerabilities ?? []) {
      const cvss =
        vuln.CVSS?.nvd?.V3Score ??
        vuln.CVSS?.nvd?.V2Score ??
        vuln.CVSS?.redhat?.V3Score;

      findings.push({
        id: '',
        category: 'DEPS',
        severity: TRIVY_SEV_MAP[vuln.Severity] ?? 'info',
        title: `${vuln.VulnerabilityID} — ${vuln.PkgName}@${vuln.InstalledVersion}`,
        file: result.Target,
        rule: vuln.VulnerabilityID,
        scanner: 'trivy',
        description: vuln.Description || vuln.Title,
        cve: vuln.VulnerabilityID,
        cvss,
        packageName: vuln.PkgName,
        packageVersion: vuln.InstalledVersion,
        fix: vuln.FixedVersion
          ? `Upgrade to ${vuln.PkgName}@${vuln.FixedVersion}`
          : 'No fixed version available yet.',
      });
    }
  }

  return findings;
}

async function runTrivyConfig(targetDir: string): Promise<Finding[]> {
  const bin = await getBinaryPath('trivy');
  const { stdout } = await execFileAsync(
    bin,
    [
      'config',
      '--format', 'json',
      '--quiet',
      targetDir,
    ],
    { maxBuffer: 50 * 1024 * 1024 },
  );

  const report: TrivyReport = JSON.parse(stdout || '{}');
  const findings: Finding[] = [];

  for (const result of report.Results ?? []) {
    for (const misconfig of result.Misconfigurations ?? []) {
      findings.push({
        id: '',
        category: 'IaC',
        severity: TRIVY_SEV_MAP[misconfig.Severity] ?? 'info',
        title: misconfig.Title,
        file: result.Target,
        rule: misconfig.ID,
        scanner: 'trivy',
        description: misconfig.Description,
        fix: misconfig.Resolution,
      });
    }
  }

  return findings;
}
