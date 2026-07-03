import { execFile } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import type { Finding, ScanResult } from '../../types.js';
import { getBinaryPath } from '../../installer.js';

const execFileAsync = promisify(execFile);
const TIMEOUT_MS = 60_000;
const MAX_BUFFER = 10 * 1024 * 1024;

export async function runIaC(targetPath: string): Promise<ScanResult> {
  const start = Date.now();
  const findings: Finding[] = [];

  try {
    const trivyBin = await getBinaryPath('trivy');
    const args = ['config', '-q', '--skip-version-check', '--format', 'json', '--skip-dirs', '**/node_modules/**', '--skip-dirs', '**/.next/**', '--skip-dirs', '**/dist/**', targetPath];

    let stdout = '';
    try {
      const result = await execFileAsync(trivyBin, args, { maxBuffer: MAX_BUFFER, timeout: TIMEOUT_MS });
      stdout = result.stdout;
    } catch (e: any) {
      if (e.killed) {
        return { scanner: 'iac', ok: false, findings: [], error: 'trivy config timed out', durationMs: Date.now() - start };
      }
      if (e.stdout) {
        stdout = e.stdout;
      } else {
        throw e;
      }
    }

    if (!stdout.trim()) {
      return { scanner: 'iac', ok: true, findings: [], durationMs: Date.now() - start };
    }

    const report = JSON.parse(stdout);

    for (const res of report.Results || []) {
      const target = res.Target;
      for (const vuln of res.Misconfigurations || []) {
        const sev = vuln.Severity.toLowerCase();
        findings.push({
          id: `iac-${randomUUID()}`,
          category: 'IaC',
          severity: sev === 'critical' ? 'critical' : sev === 'high' ? 'high' : sev === 'medium' ? 'medium' : 'low',
          title: vuln.Title || vuln.ID,
          file: target,
          rule: vuln.ID,
          scanner: 'iac',
          description: vuln.Description,
          fix: vuln.Resolution || vuln.Message,
        });
      }
    }

    return { scanner: 'iac', ok: true, findings, durationMs: Date.now() - start };
  } catch (error: any) {
    return { scanner: 'iac', ok: false, findings: [], error: error.message, durationMs: Date.now() - start };
  }
}
