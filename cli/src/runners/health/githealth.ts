import { exec } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import type { Finding, ScanResult } from '../../types.js';

const execAsync = promisify(exec);

export async function runGitHealth(targetPath: string): Promise<ScanResult> {
  const start = Date.now();
  const findings: Finding[] = [];

  try {
    // get list of modified files in git history, sort by frequency
    // Note: on Windows bash -c is needed, or we use powershell equivalent,
    // but cross platform node exec can just run git log
    // git log --name-only --format="" prints all files ever changed
    const { stdout } = await execAsync(`git log --name-only --format=""`, { cwd: targetPath, maxBuffer: 50 * 1024 * 1024 });
    
    if (!stdout.trim()) {
      return { scanner: 'githealth', ok: true, findings: [], durationMs: Date.now() - start };
    }

    const files = stdout.split('\n').filter(Boolean);
    const fileCounts: Record<string, number> = {};

    for (const f of files) {
      if (f.trim()) {
        fileCounts[f] = (fileCounts[f] || 0) + 1;
      }
    }

    // Flag files changed more than 50 times
    for (const [file, count] of Object.entries(fileCounts)) {
      if (count >= 50) {
        findings.push({
          id: `githealth-${randomUUID()}`,
          category: 'GIT_HEALTH',
          severity: 'info',
          title: `Git Hotspot: Highly modified file (${count} changes)`,
          file,
          rule: 'githealth/hotspot',
          scanner: 'githealth',
          description: `This file has been modified ${count} times in the git history. High churn indicates a potential architectural hotspot that might need refactoring.`,
        });
      }
    }

    return {
      scanner: 'githealth',
      ok: true,
      findings,
      durationMs: Date.now() - start,
    };
  } catch (error: any) {
    return {
      scanner: 'githealth',
      ok: false,
      findings: [],
      error: error.message,
      durationMs: Date.now() - start,
    };
  }
}
