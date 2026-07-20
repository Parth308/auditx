import { exec } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { join } from 'path';
import type { Finding, ScanResult } from '../../types.js';

const execAsync = promisify(exec);

export async function runNpmOutdated(targetDir: string, _stagedFiles?: string[], _stack?: any, workspaceName?: string): Promise<ScanResult> {
  const start = Date.now();
  const scanner = 'npm-outdated';
  const findings: Finding[] = [];

  try {
    const pkgPath = join(targetDir, 'package.json');
    if (!existsSync(pkgPath)) {
      return { scanner, ok: true, findings: [], durationMs: Date.now() - start };
    }

    let stdout = '';
    try {
      // npm outdated exits with code 1 if there are outdated packages
      const result = await execAsync(`npm outdated --json`, { cwd: targetDir, maxBuffer: 10 * 1024 * 1024 });
      stdout = result.stdout;
    } catch (e: any) {
      if (e.stdout) {
        stdout = e.stdout;
      } else {
        throw e;
      }
    }

    if (!stdout.trim()) {
      return { scanner, ok: true, findings: [], durationMs: Date.now() - start };
    }

    const report = JSON.parse(stdout);

    for (const [pkg, info] of Object.entries<any>(report)) {
      findings.push({
        id: `outdated-${randomUUID()}`,
        category: 'DEP_HEALTH',
        severity: 'info',
        title: `Outdated dependency: ${pkg}`,
        file: 'package.json',
        rule: 'npm/outdated',
        scanner,
        description: `Package '${pkg}' is outdated. Current: ${info.current}, Wanted: ${info.wanted}, Latest: ${info.latest}.`,
        fix: `npm install ${pkg}@latest`,
        ...(workspaceName ? { workspace: workspaceName } : {}),
      });
    }

    return {
      scanner,
      ok: true,
      findings,
      durationMs: Date.now() - start,
    };
  } catch (error: any) {
    return {
      scanner,
      ok: false,
      findings: [],
      error: error.message,
      durationMs: Date.now() - start,
    };
  }
}
