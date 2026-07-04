import { execFile } from 'child_process';
import { join } from 'path';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import { existsSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import type { Finding, ScanResult, Severity, StackInfo } from '../../types.js';
import { getBinaryPath, getSemgrepEnv } from '../../installer.js';

const execFileAsync = promisify(execFile);
const TIMEOUT_MS = 120_000;
const MAX_BUFFER = 50 * 1024 * 1024;

function mapSeverity(sev: string): Severity {
  switch (sev) {
    case 'ERROR': return 'high';
    case 'WARNING': return 'medium';
    default: return 'low';
  }
}

export async function runAiPatterns(targetPath: string, stagedFiles: string[] | undefined, stack: StackInfo): Promise<ScanResult> {
  const start = Date.now();
  const findings: Finding[] = [];

  try {
    const semgrepBin = await getBinaryPath('semgrep');

    const rulesRoot = fileURLToPath(new URL('../src/rules', import.meta.url));
    const rulesDevRoot = fileURLToPath(new URL('../../rules', import.meta.url));
    const baseRulesDir = existsSync(rulesRoot) ? rulesRoot : rulesDevRoot;

    if (!existsSync(baseRulesDir)) {
      return { scanner: 'aipatterns', ok: false, findings: [], error: 'ruleset directory not found', durationMs: Date.now() - start };
    }

    const configArgs = ['--config', join(baseRulesDir, 'core')];
    if (stack.hasTypeScript) {
      configArgs.push('--config', join(baseRulesDir, 'languages', 'typescript.yml'));
    }
    if (stack.hasReact) {
      configArgs.push('--config', join(baseRulesDir, 'frameworks', 'react.yml'));
    }
    if (stack.hasNextJs) {
      configArgs.push('--config', join(baseRulesDir, 'frameworks', 'nextjs.yml'));
    }
    if (stack.hasNestJs) {
      configArgs.push('--config', join(baseRulesDir, 'frameworks', 'nestjs.yml'));
    }
    if (stack.hasExpress) {
      configArgs.push('--config', join(baseRulesDir, 'frameworks', 'express.yml'));
    }
    if (stack.hasPython) {
      configArgs.push('--config', join(baseRulesDir, 'languages', 'python.yml'));
    }
    if (stack.hasDjango) {
      configArgs.push('--config', join(baseRulesDir, 'frameworks', 'django.yml'));
    }
    if (stack.hasGo) {
      configArgs.push('--config', join(baseRulesDir, 'languages', 'golang.yml'));
    }

    const targets = stagedFiles && stagedFiles.length > 0 ? stagedFiles : [targetPath];

    const args = [
      'scan',
      ...configArgs,
      '--json',
      '--timeout', '30',
      '--exclude', 'node_modules',
      '--exclude', '.next',
      '--exclude', 'dist',
      '--exclude', 'build',
      '--exclude', '.git',
      ...targets
    ];

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
      const cleanCheckId = res.check_id.includes('.') 
        ? res.check_id.split('.').pop() || res.check_id
        : res.check_id;
        
      findings.push({
        id: `aipatterns-${randomUUID()}`,
        category: 'AI_CODE',
        severity: mapSeverity(res.extra.severity),
        title: `AI Code Pattern: ${cleanCheckId.replace('ai-', '')}`,
        file: res.path,
        line: res.start?.line,
        rule: cleanCheckId,
        scanner: 'aipatterns',
        description: res.extra.message,
      });
    }

    return { scanner: 'aipatterns', ok: true, findings, durationMs: Date.now() - start };
  } catch (error: any) {
    return { scanner: 'aipatterns', ok: false, findings: [], error: error.message, durationMs: Date.now() - start };
  }
}