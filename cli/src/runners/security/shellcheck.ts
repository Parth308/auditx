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

    try {
      const res = await execFileAsync(
        bin,
        ['-f', 'json', ...filesToScan],
        { maxBuffer: 50 * 1024 * 1024 }
      );
      stdout = res.stdout;
    } catch (err: any) {
      if (err.stdout) stdout = err.stdout;
    }

    let raw: any[] = [];
    if (stdout) {
      try {
        raw = JSON.parse(stdout);
      } catch {
        // Ignored
      }
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
