import { execFile } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import type { Finding, ScanResult, Severity } from '../../types.js';
import { getBinaryPath, getSemgrepEnv } from '../../installer.js';

const execFileAsync = promisify(execFile);
const TIMEOUT_MS = 60_000;
const MAX_BUFFER = 50 * 1024 * 1024;

function mapSeverity(sev: string): Severity {
  switch (sev) {
    case 'ERROR': return 'high';
    case 'WARNING': return 'medium';
    default: return 'low';
  }
}

export async function runAiPatterns(targetPath: string, stagedFiles?: string[]): Promise<ScanResult> {
  const start = Date.now();
  const findings: Finding[] = [];

  try {
    const semgrepBin = await getBinaryPath('semgrep');

    const prodRules = fileURLToPath(new URL('../src/rules/ai-patterns.yml', import.meta.url));
    const devRules = fileURLToPath(new URL('../rules/ai-patterns.yml', import.meta.url));
    const rulesPath = existsSync(prodRules) ? prodRules : devRules;

    if (!existsSync(rulesPath)) {
      return { scanner: 'aipatterns', ok: false, findings: [], error: 'ruleset file not found', durationMs: Date.now() - start };
    }

    const targets = stagedFiles && stagedFiles.length > 0 ? stagedFiles : [targetPath];
    const args = ['scan', '--config', rulesPath, '--json', '--timeout', '30', ...targets];

    let stdout = '';
    try {
      const result = await execFileAsync(semgrepBin, args, {
        maxBuffer: MAX_BUFFER,
        timeout: TIMEOUT_MS,
        env: getSemgrepEnv(),
      });
      stdout = result.stdout;
    } catch (e: any) {
      if (e.killed) {
        return { scanner: 'aipatterns', ok: false, findings: [], error: 'semgrep timed out after 60s', durationMs: Date.now() - start };
      }
      if (e.stdout) {
        stdout = e.stdout; // semgrep exits nonzero when findings exist — expected
      } else {
        throw e;
      }
    }

    if (!stdout.trim()) {
      return { scanner: 'aipatterns', ok: true, findings: [], durationMs: Date.now() - start };
    }

    const report = JSON.parse(stdout);

    if (report.errors?.length > 0) {
      // rule-level errors (bad yaml, parse failures on a file) shouldn't silently pass as clean
      for (const err of report.errors) {
        findings.push({
          id: `aipatterns-err-${randomUUID()}`,
          category: 'AI_CODE',
          severity: 'info',
          title: 'Semgrep scan error',
          file: err.path ?? 'unknown',
          rule: 'aipatterns-internal',
          scanner: 'aipatterns',
          description: err.message ?? JSON.stringify(err),
        });
      }
    }

    for (const res of report.results || []) {
      findings.push({
        id: `aipatterns-${randomUUID()}`,
        category: 'AI_CODE',
        severity: mapSeverity(res.extra.severity),
        title: `AI Code Pattern: ${res.check_id.replace('ai-', '')}`,
        file: res.path,
        line: res.start?.line,
        rule: res.check_id,
        scanner: 'aipatterns',
        description: res.extra.message,
      });
    }

    return { scanner: 'aipatterns', ok: true, findings, durationMs: Date.now() - start };
  } catch (error: any) {
    return { scanner: 'aipatterns', ok: false, findings: [], error: error.message, durationMs: Date.now() - start };
  }
}