import { execFile } from 'child_process';
import { promisify } from 'util';
import type { Finding, ScanResult } from '../../types.js';

const execFileAsync = promisify(execFile);

// ─── knip JSON output types ───────────────────────────────────────────────────

interface KnipFile {
  file: string;
  dependencies?: string[];
  devDependencies?: string[];
  unlisted?: string[];
  binaries?: string[];
  unresolved?: string[];
  exports?: Array<{ name: string; line: number; col: number; pos: number }>;
  types?: Array<{ name: string; line: number; col: number; pos: number }>;
  enumMembers?: Record<string, Array<{ name: string; line: number }>>;
  classMembers?: Record<string, Array<{ name: string; line: number }>>;
  duplicates?: Array<Array<{ name: string; line: number; col: number }>>;
}

interface KnipReport {
  files?: string[];
  issues?: KnipFile[];
}

// ─── Runner ───────────────────────────────────────────────────────────────────

/**
 * Runs `knip` in the target directory and maps unused exports, files, and
 * dependencies to normalized DEAD_CODE findings.
 */
export async function runKnip(targetDir: string): Promise<ScanResult> {
  const start = Date.now();
  const scanner = 'knip';

  try {
    const npxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const result = await execFileAsync(
      npxBin,
      ['--yes', 'knip', '--reporter', 'json'],
      { cwd: targetDir, maxBuffer: 20 * 1024 * 1024, shell: process.platform === 'win32' },
    ).catch((err) => {
      if (err.stdout) return { stdout: err.stdout as string };
      throw err;
    });

    const report: KnipReport = JSON.parse(result.stdout || '{}');
    const findings: Finding[] = [];

    // Unused files
    for (const file of report.files ?? []) {
      findings.push({
        id: '',
        category: 'DEAD_CODE',
        severity: 'low',
        title: `Unused file: ${file}`,
        file,
        scanner,
        description: 'This file is not imported or used anywhere in the project.',
        fix: 'Remove this file if it is no longer needed.',
      });
    }

    // Unused exports and other issues per file
    for (const issue of report.issues ?? []) {
      for (const exp of issue.exports ?? []) {
        findings.push({
          id: '',
          category: 'DEAD_CODE',
          severity: 'low',
          title: `Unused export: ${exp.name}`,
          file: issue.file,
          line: exp.line,
          scanner,
          description: `'${exp.name}' is exported but never imported anywhere.`,
          fix: `Remove the export for '${exp.name}' or delete it if unused.`,
        });
      }

      for (const dep of issue.dependencies ?? []) {
        findings.push({
          id: '',
          category: 'DEAD_CODE',
          severity: 'low',
          title: `Unused dependency: ${dep}`,
          file: issue.file,
          scanner,
          description: `Package '${dep}' is listed in dependencies but not used.`,
          fix: `Run: npm uninstall ${dep}`,
        });
      }

      for (const dep of issue.devDependencies ?? []) {
        findings.push({
          id: '',
          category: 'DEAD_CODE',
          severity: 'low',
          title: `Unused devDependency: ${dep}`,
          file: issue.file,
          scanner,
          description: `Package '${dep}' is listed in devDependencies but not used.`,
          fix: `Run: npm uninstall --save-dev ${dep}`,
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
