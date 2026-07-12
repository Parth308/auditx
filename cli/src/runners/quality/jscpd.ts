import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { readFileSync, rmSync, existsSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import type { Finding, ScanResult } from '../../types.js';

const execAsync = promisify(exec);

export async function runJscpd(targetPath: string, stagedFiles?: string[]): Promise<ScanResult> {
  const start = Date.now();
  const tmpDir = join(tmpdir(), `auditx-jscpd-${randomUUID()}`);

  try {
    mkdirSync(tmpDir, { recursive: true });
    
    const findings: Finding[] = [];
    
    // jscpd exits with code 1 if it finds duplicates above threshold.
    const processJscpdRun = async (targets: string) => {
      try {
        await execAsync(`npx --yes jscpd ${targets} --reporters json --output "${tmpDir}" --silent`, { maxBuffer: 10 * 1024 * 1024 });
      } catch (e) {}

      const reportPath = join(tmpDir, 'jscpd-report.json');
      if (existsSync(reportPath)) {
        const rawData = readFileSync(reportPath, 'utf8');
        const report = JSON.parse(rawData);
        if (report.statistics && report.statistics.duplications > 0) {
          const duplicates = report.duplicates || [];
          for (const dup of duplicates) {
            findings.push({
              id: `jscpd-${randomUUID()}`,
              category: 'DUPLICATION',
              severity: 'medium',
              title: `Code duplication detected (${dup.lines} lines)`,
              file: dup.firstFile.name,
              line: dup.firstFile.start,
              rule: 'jscpd/duplication',
              scanner: 'jscpd',
              description: `This block of code is identical to code in ${dup.secondFile.name}:${dup.secondFile.start}.`,
              match: dup.fragment,
            });
          }
        }
        rmSync(reportPath, { force: true });
      }
    };

    if (stagedFiles && stagedFiles.length > 0) {
      const maxCommandLength = 7000;
      let currentChunk: string[] = [];
      let currentLength = 0;

      for (const file of stagedFiles) {
        const quoted = `"${file}"`;
        if (currentChunk.length > 0 && currentLength + quoted.length + 1 > maxCommandLength) {
          await processJscpdRun(currentChunk.join(' '));
          currentChunk = [];
          currentLength = 0;
        }
        currentChunk.push(quoted);
        currentLength += quoted.length + 1;
      }
      if (currentChunk.length > 0) {
        await processJscpdRun(currentChunk.join(' '));
      }
    } else {
      await processJscpdRun(`"${targetPath}"`);
    }

    return {
      scanner: 'jscpd',
      ok: true,
      findings,
      durationMs: Date.now() - start,
    };
  } catch (error: any) {
    return {
      scanner: 'jscpd',
      ok: false,
      findings: [],
      error: error.message,
      durationMs: Date.now() - start,
    };
  } finally {
    try {
      if (existsSync(tmpDir)) {
        rmSync(tmpDir, { recursive: true, force: true });
      }
    } catch {}
  }
}
