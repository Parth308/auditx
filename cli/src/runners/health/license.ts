import { exec } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import type { Finding, ScanResult } from '../../types.js';

const execAsync = promisify(exec);

const RESTRICTIVE_LICENSES = ['GPL', 'AGPL', 'LGPL'];

export async function runLicenseChecker(targetPath: string, _stagedFiles?: string[], _stack?: any, workspaceName?: string): Promise<ScanResult> {
  const start = Date.now();
  const findings: Finding[] = [];

  try {
    const { stdout } = await execAsync(`npx --yes license-checker --json --start "${targetPath}"`, { maxBuffer: 10 * 1024 * 1024 });
    const report = JSON.parse(stdout);

    for (const [pkgName, details] of Object.entries(report) as [string, any][]) {
      const licenses = Array.isArray(details.licenses) ? details.licenses : [details.licenses];
      
      for (const license of licenses) {
        if (typeof license === 'string') {
          const isRestrictive = RESTRICTIVE_LICENSES.some((r) => license.includes(r));
          if (isRestrictive) {
            findings.push({
              id: `license-${randomUUID()}`,
              category: 'LICENSE',
              severity: 'high',
              title: `Restrictive License Detected: ${license}`,
              file: 'package.json',
              rule: 'license-checker/restrictive',
              scanner: 'license-checker',
              description: `The package '${pkgName}' uses a restrictive ${license} license, which may require you to open-source your own project if distributed.`,
              packageName: pkgName.split('@')[0],
              packageVersion: pkgName.split('@')[1],
              ...(workspaceName ? { workspace: workspaceName } : {}),
            });
          }
        }
      }
    }

    return {
      scanner: 'license-checker',
      ok: true,
      findings,
      durationMs: Date.now() - start,
    };
  } catch (error: any) {
    return {
      scanner: 'license-checker',
      ok: false,
      findings: [],
      error: error.message,
      durationMs: Date.now() - start,
    };
  }
}
