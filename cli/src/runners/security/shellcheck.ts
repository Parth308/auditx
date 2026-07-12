import { execFile } from 'child_process';
import { promisify } from 'util';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import type { Finding, ScanResult } from '../../types.js';
import { getBinaryPath } from '../../installer.js';

const execFileAsync = promisify(execFile);

function findShFiles(dir: string, fileList: string[] = []) {
  try {
    const files = readdirSync(dir);
    for (const file of files) {
      if (file === 'node_modules' || file === '.git') continue;
      const filePath = join(dir, file);
      if (statSync(filePath).isDirectory()) {
        findShFiles(filePath, fileList);
      } else if (file.endsWith('.sh') || file.endsWith('.bash')) {
        fileList.push(filePath);
      }
    }
  } catch {
    // Ignore permissions/missing
  }
  return fileList;
}

export async function runShellcheck(targetDir: string, stagedFiles?: string[]): Promise<ScanResult> {
  const start = Date.now();
  const scanner = 'shellcheck';

  let filesToScan: string[] = [];
  if (stagedFiles) {
    filesToScan = stagedFiles.filter((f) => f.endsWith('.sh') || f.endsWith('.bash'));
  } else {
    filesToScan = findShFiles(targetDir);
  }

  if (filesToScan.length === 0) {
    return { scanner, ok: true, findings: [], durationMs: Date.now() - start };
  }

  try {
    const bin = await getBinaryPath('shellcheck');
    let stdout = '';

    let raw: any[] = [];
    const maxCommandLength = 7000;
    let currentChunk: string[] = [];
    let currentLength = 0;

    const processShellcheckRun = async (chunk: string[]) => {
      let chunkStdout = '';
      try {
        const res = await execFileAsync(
          bin,
          ['-f', 'json', ...chunk],
          { maxBuffer: 50 * 1024 * 1024 }
        );
        chunkStdout = res.stdout;
      } catch (err: any) {
        if (err.stdout) chunkStdout = err.stdout;
      }

      if (chunkStdout) {
        try {
          raw.push(...JSON.parse(chunkStdout));
        } catch {
          // Ignored
        }
      }
    };

    for (const file of filesToScan) {
      const estimateLen = file.length + 3;
      if (currentChunk.length > 0 && currentLength + estimateLen > maxCommandLength) {
        await processShellcheckRun(currentChunk);
        currentChunk = [];
        currentLength = 0;
      }
      currentChunk.push(file);
      currentLength += estimateLen;
    }
    if (currentChunk.length > 0) {
      await processShellcheckRun(currentChunk);
    }

    const findings: Finding[] = raw.map((item) => {
      // shellcheck levels: error, warning, info, style
      let severity: Finding['severity'] = 'info';
      if (item.level === 'error') severity = 'high';
      else if (item.level === 'warning') severity = 'medium';
      else if (item.level === 'info') severity = 'low';

      return {
        id: '',
        category: 'SAST',
        severity,
        title: `ShellCheck ${item.code}: ${item.message}`,
        file: item.file,
        line: item.line,
        rule: `SC${item.code}`,
        scanner,
        description: item.message,
        fix: `Review ShellCheck wiki for SC${item.code}`,
      };
    });

    return { scanner, ok: true, findings, durationMs: Date.now() - start };
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return {
        scanner,
        ok: false,
        findings: [],
        error: 'shellcheck not found',
        durationMs: Date.now() - start,
      };
    }

    return {
      scanner,
      ok: false,
      findings: [],
      error: String(err.message),
      durationMs: Date.now() - start,
    };
  }
}
