import { exec } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import type { Finding, ScanResult } from '../../types.js';

const execAsync = promisify(exec);

export async function runLizard(targetPath: string, stagedFiles?: string[]): Promise<ScanResult> {
  const start = Date.now();
  const findings: Finding[] = [];

  try {
    let stdout = '';
    const processLizardRun = async (targets: string) => {
      try {
        const result = await execAsync(`lizard ${targets} -C 15 -w`, { maxBuffer: 10 * 1024 * 1024 });
        stdout += result.stdout + '\n';
      } catch (e: any) {
        if (e.stdout) {
          stdout += e.stdout + '\n';
        } else {
          throw e;
        }
      }
    };

    if (stagedFiles && stagedFiles.length > 0) {
      const CHUNK_SIZE = 500;
      for (let i = 0; i < stagedFiles.length; i += CHUNK_SIZE) {
        const chunk = stagedFiles.slice(i, i + CHUNK_SIZE);
        await processLizardRun(chunk.map(f => `"${f}"`).join(' '));
      }
    } else {
      await processLizardRun(`"${targetPath}"`);
    }

    if (!stdout.trim()) {
      return { scanner: 'lizard', ok: true, findings: [], durationMs: Date.now() - start };
    }

    const lines = stdout.split('\n');
    // format: file:line: warning: function_name has X NLOC, Y CCN, Z token...
    const warningRegex = /^(.+?):(\d+):\s*warning:\s*(.*)/i;

    for (const line of lines) {
      const match = line.match(warningRegex);
      if (match) {
        const [, file, lineNum, message] = match;
        findings.push({
          id: `lizard-${randomUUID()}`,
          category: 'COMPLEXITY',
          severity: 'high',
          title: 'High Cyclomatic Complexity',
          file: file.trim(),
          line: parseInt(lineNum, 10),
          rule: 'lizard/complexity',
          scanner: 'lizard',
          description: message.trim(),
          fix: 'Refactor this function to be smaller and less nested.',
        });
      }
    }

    return {
      scanner: 'lizard',
      ok: true,
      findings,
      durationMs: Date.now() - start,
    };
  } catch (error: any) {
    return {
      scanner: 'lizard',
      ok: false,
      findings: [],
      error: error.message,
      durationMs: Date.now() - start,
    };
  }
}
