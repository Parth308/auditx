import { exec } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import type { Finding, ScanResult } from '../../types.js';

const execAsync = promisify(exec);

export async function runPrettierCheck(targetDir: string): Promise<ScanResult> {
  const start = Date.now();
  const scanner = 'prettier';
  const findings: Finding[] = [];

  try {
    let stdout = '';
    try {
      // prettier --list-different prints files that are not formatted correctly.
      // It exits 0 if everything is fine, and 1 if there are unformatted files.
      // We use a broad glob for common file types.
      const cmd = `npx --yes prettier --list-different "**/*.{js,ts,jsx,tsx,json,css,md,html,yml,yaml}" --ignore-path ".gitignore"`;
      const result = await execAsync(cmd, { cwd: targetDir, maxBuffer: 50 * 1024 * 1024 });
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

    const files = stdout.split('\n').map(line => line.trim()).filter(Boolean);

    for (const file of files) {
      // Sometimes prettier outputs warnings or messages like '[warn] ...'
      // We filter out anything that looks like a logger message, or just clean it up.
      let cleanFile = file;
      if (cleanFile.includes('] ')) {
         cleanFile = cleanFile.split('] ')[1];
      }

      findings.push({
        id: `prettier-${randomUUID()}`,
        category: 'PATTERNS',
        severity: 'info',
        title: 'Unformatted file',
        file: cleanFile,
        line: 1,
        rule: 'prettier/format',
        scanner,
        description: `File ${cleanFile} is not formatted according to Prettier standards.`,
        fix: `Run 'npx prettier --write "${cleanFile}"' to format this file.`,
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
