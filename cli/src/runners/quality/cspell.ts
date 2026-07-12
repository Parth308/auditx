import { exec } from 'child_process';
import { promisify } from 'util';
import type { Finding, ScanResult } from '../../types.js';

const execAsync = promisify(exec);

export async function runCspell(targetDir: string, stagedFiles?: string[]): Promise<ScanResult> {
  const start = Date.now();
  const scanner = 'cspell';

  let stdout = '';
  try {
    if (stagedFiles && stagedFiles.length > 0) {
      const maxCommandLength = 7000;
      let currentChunk: string[] = [];
      let currentLength = 0;

      const processCspellRun = async (targets: string) => {
        const command = `npx --yes cspell ${targets} --no-progress --no-summary --show-context=false --dot`;
        const res = await execAsync(command, { cwd: targetDir, maxBuffer: 50 * 1024 * 1024 }).catch(err => ({ stdout: err.stdout || '' }));
        stdout += res.stdout + '\n';
      };

      for (const file of stagedFiles) {
        const quoted = `"${file}"`;
        if (currentChunk.length > 0 && currentLength + quoted.length + 1 > maxCommandLength) {
          await processCspellRun(currentChunk.join(' '));
          currentChunk = [];
          currentLength = 0;
        }
        currentChunk.push(quoted);
        currentLength += quoted.length + 1;
      }
      if (currentChunk.length > 0) {
        await processCspellRun(currentChunk.join(' '));
      }
    } else {
      const command = `npx --yes cspell "**/*" --no-progress --no-summary --show-context=false --dot`;
      const res = await execAsync(command, { cwd: targetDir, maxBuffer: 50 * 1024 * 1024 }).catch(err => ({ stdout: err.stdout || '' }));
      stdout = res.stdout;
    }

    // Example cspell output:
    // path/to/file.ts:14:5 - Unknown word (usreName)
    const lines = stdout.split('\n').filter(Boolean);
    const findings: Finding[] = [];

    const regex = /^(.*?):(\d+):(\d+)\s+-\s+(.*?)\s+\((.*?)\)$/;

    for (const line of lines) {
      const match = line.match(regex);
      if (match) {
        const [, file, lineNum, colNum, msg, word] = match;
        findings.push({
          id: '',
          category: 'QUALITY' as any, // We might need to add QUALITY to types if not present, but using 'PATTERNS' or similar is fine. Let's use 'PATTERNS' for now, or just force cast it.
          severity: 'info', // Spelling is always info/low priority
          title: `Unknown word: ${word}`,
          file,
          line: parseInt(lineNum, 10),
          rule: 'cspell/spelling',
          scanner,
          description: `Spelling issue detected: ${word}`,
          fix: `Fix spelling of "${word}" or add it to a cspell.json dictionary.`,
        });
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
