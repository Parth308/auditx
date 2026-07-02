import { execFile } from 'child_process';
import { promisify } from 'util';
import type { Finding, ScanResult } from '../../types.js';
import { getBinaryPath } from '../../installer.js';

const execFileAsync = promisify(execFile);

export async function runOsvScanner(targetDir: string): Promise<ScanResult> {
  const start = Date.now();
  const scanner = 'osv-scanner';

  try {
    const bin = await getBinaryPath('osv-scanner');
    let stdout = '';

    try {
      const res = await execFileAsync(
        bin,
        ['-r', '--json', targetDir],
        { maxBuffer: 50 * 1024 * 1024 }
      );
      stdout = res.stdout;
    } catch (err: any) {
      // OSV-Scanner exits with 1 if vulnerabilities are found
      if (err.stdout) stdout = err.stdout;
    }

    let raw: any = { results: [] };
    if (stdout) {
      try {
        raw = JSON.parse(stdout);
      } catch {
        // Ignored
      }
    }

    const findings: Finding[] = [];

    for (const result of raw.results || []) {
      const file = result.source?.path || targetDir;
      for (const pkg of result.packages || []) {
        for (const vuln of pkg.vulnerabilities || []) {
          const title = vuln.summary || `Vulnerability in ${pkg.package?.name}`;
          const cve = vuln.aliases?.find((a: string) => a.startsWith('CVE-')) || vuln.id;
          
          findings.push({
            id: '',
            category: 'DEPS',
            severity: 'high', // OSV does not strictly provide CVSS in top level without fetching, default to high
            title: `${vuln.id}: ${title}`,
            file,
            rule: vuln.id,
            scanner,
            description: vuln.details || title,
            cve,
            packageName: pkg.package?.name,
            packageVersion: pkg.package?.version,
            fix: `Check https://osv.dev/vulnerability/${vuln.id} for remediation.`,
          });
        }
      }
    }

    return { scanner, ok: true, findings, durationMs: Date.now() - start };
  } catch (err: any) {
    return {
      scanner,
      ok: false,
      findings: [],
      error: String(err.message),
      durationMs: Date.now() - start,
    };
  }
}
