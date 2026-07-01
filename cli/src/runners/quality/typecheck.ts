import { exec } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import type { Finding, ScanResult } from '../../types.js';

const execAsync = promisify(exec);

export async function runTypecheck(targetPath: string): Promise<ScanResult> {
  const start = Date.now();
  const findings: Finding[] = [];

  try {
    let stdout = '';
    try {
      const result = await execAsync(`npx --yes tsc --noEmit --project "${targetPath}/tsconfig.json"`, { maxBuffer: 10 * 1024 * 1024 });
      stdout = result.stdout;
    } catch (e: any) {
      // tsc exits with 2 if there are type errors
      if (e.stdout) {
        stdout = e.stdout;
      } else {
        throw e;
      }
    }

    if (!stdout.trim()) {
      return { scanner: 'typecheck', ok: true, findings: [], durationMs: Date.now() - start };
    }

    const lines = stdout.split('\n');
    const tsErrorRegex = /^(.+)\((\d+),\d+\):\s+error\s+(TS\d+):\s+(.+)$/;

    for (const line of lines) {
      const match = line.match(tsErrorRegex);
      if (match) {
        const [, file, lineNum, rule, message] = match;
        findings.push({
          id: `tsc-${randomUUID()}`,
          category: 'TYPE_SAFETY',
          severity: 'medium',
          title: `TypeScript Error: ${rule}`,
          file: file.trim(),
          line: parseInt(lineNum, 10),
          rule,
          scanner: 'typecheck',
          description: message.trim(),
        });
      }
    }

    return {
      scanner: 'typecheck',
      ok: true,
      findings,
      durationMs: Date.now() - start,
    };
  } catch (error: any) {
    return {
      scanner: 'typecheck',
      ok: false,
      findings: [],
      error: error.message,
      durationMs: Date.now() - start,
    };
  }
}
