import { exec } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import type { Finding, ScanResult } from '../../types.js';

const execAsync = promisify(exec);

export async function runDepcheck(targetPath: string): Promise<ScanResult> {
  const start = Date.now();
  const findings: Finding[] = [];

  try {
    // depcheck exits with -1 or 1 if issues are found, so we must catch it
    let stdout = '';
    try {
      const result = await execAsync(`npx --yes depcheck "${targetPath}" --json`, { maxBuffer: 10 * 1024 * 1024 });
      stdout = result.stdout;
    } catch (e: any) {
      if (e.stdout) {
        stdout = e.stdout;
      } else {
        throw e;
      }
    }

    if (!stdout.trim()) {
      return { scanner: 'depcheck', ok: true, findings: [], durationMs: Date.now() - start };
    }

    const report = JSON.parse(stdout);

    if (report.dependencies && report.dependencies.length > 0) {
      for (const dep of report.dependencies) {
        findings.push({
          id: `depcheck-${randomUUID()}`,
          category: 'DEP_HEALTH',
          severity: 'low',
          title: `Unused dependency: ${dep}`,
          file: 'package.json',
          rule: 'depcheck/unused-dependency',
          scanner: 'depcheck',
          description: `The package '${dep}' is defined in package.json but never used in the codebase.`,
          fix: `npm uninstall ${dep}`,
        });
      }
    }

    if (report.devDependencies && report.devDependencies.length > 0) {
      for (const dep of report.devDependencies) {
        findings.push({
          id: `depcheck-${randomUUID()}`,
          category: 'DEP_HEALTH',
          severity: 'info',
          title: `Unused devDependency: ${dep}`,
          file: 'package.json',
          rule: 'depcheck/unused-dev-dependency',
          scanner: 'depcheck',
          description: `The dev package '${dep}' is defined but never used.`,
          fix: `npm uninstall ${dep}`,
        });
      }
    }

    if (report.missing && Object.keys(report.missing).length > 0) {
      for (const [dep, files] of Object.entries(report.missing)) {
        findings.push({
          id: `depcheck-${randomUUID()}`,
          category: 'DEP_HEALTH',
          severity: 'medium',
          title: `Missing dependency: ${dep}`,
          rule: 'depcheck/missing-dependency',
          scanner: 'depcheck',
          description: `The package '${dep}' is used in code but missing from package.json.`,
          fix: `npm install ${dep}`,
        });
      }
    }

    return {
      scanner: 'depcheck',
      ok: true,
      findings,
      durationMs: Date.now() - start,
    };
  } catch (error: any) {
    return {
      scanner: 'depcheck',
      ok: false,
      findings: [],
      error: error.message,
      durationMs: Date.now() - start,
    };
  }
}
