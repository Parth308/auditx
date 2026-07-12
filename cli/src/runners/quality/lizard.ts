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
      const maxCommandLength = 7000;
      let currentChunk: string[] = [];
      let currentLength = 0;

      for (const file of stagedFiles) {
        const quoted = `"${file}"`;
        if (currentChunk.length > 0 && currentLength + quoted.length + 1 > maxCommandLength) {
          await processLizardRun(currentChunk.join(' '));
          currentChunk = [];
          currentLength = 0;
        }
        currentChunk.push(quoted);
        currentLength += quoted.length + 1;
      }
      if (currentChunk.length > 0) {
        await processLizardRun(currentChunk.join(' '));
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
          severity: 'medium',
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
    const isNotFound = error.code === 127 || error.message.includes('not found') || error.message.includes('is not recognized');
    return {
      scanner: 'lizard',
      ok: false,
      findings: [],
      error: isNotFound ? 'lizard not found. Please install python and run: pip install lizard' : error.message,
      durationMs: Date.now() - start,
    };
  }
}
