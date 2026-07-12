import { exec } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import { join } from 'path';
import type { Finding, ScanResult } from '../../types.js';

const execAsync = promisify(exec);

interface LeasotFinding {
  file: string;
  text: string;
  kind: string;
  line: number;
  ref: string;
}

export async function runTodoCheck(targetDir: string): Promise<ScanResult> {
  const start = Date.now();
  const scanner = 'todocheck';
  const findings: Finding[] = [];

  try {
    let stdout = '';
    try {
      // leasot searches for TODOs and FIXMEs. It exits 0 normally, but we catch just in case.
      // We use a broad glob to match many common languages.
      const cmd = `npx --yes leasot "**/*.{js,ts,jsx,tsx,py,go,rs,java,c,cpp,cs,rb,php}" --reporter json --ignore "node_modules,dist,build,coverage,.git"`;
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

    const report: LeasotFinding[] = JSON.parse(stdout);

    for (const item of report) {
      findings.push({
        id: `todocheck-${randomUUID()}`,
        category: 'PATTERNS',
        severity: 'info',
        title: `Unresolved ${item.kind} comment`,
        file: item.file,
        line: item.line,
        rule: `todo/${item.kind.toLowerCase()}`,
        scanner,
        description: `Found unresolved ${item.kind}: ${item.text}`,
        fix: 'Resolve the task and remove the comment.',
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
