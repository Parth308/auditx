import { execFile } from 'child_process';
import { join } from 'path';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import { existsSync, writeFileSync, readFileSync, statSync } from 'fs';
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

    const configArgs = buildConfigArgs(stack, baseRulesDir);
    const filteredFiles = filterFiles(stagedFiles);

    if (stagedFiles && stagedFiles.length > 0 && filteredFiles.length === 0) {
      return { scanner: 'aipatterns', ok: true, findings: [], durationMs: Date.now() - start };
    }

    const targets = filteredFiles.length > 0 ? filteredFiles : [targetPath];
    const args = [
      'scan',
      ...configArgs,
      '--json', '--timeout', '30',
      '--exclude', 'node_modules', '--exclude', '.next', '--exclude', 'dist', '--exclude', 'build', '--exclude', '.git',
      ...targets
    ];

    let stdout = '';
    try {
      const result = await execFileAsync(semgrepBin, args, { maxBuffer: MAX_BUFFER, timeout: TIMEOUT_MS, env: getSemgrepEnv() });
      stdout = result.stdout;
    } catch (e: any) {
      if (e.killed) return { scanner: 'aipatterns', ok: false, findings: [], error: 'semgrep timed out', durationMs: Date.now() - start };
      if (e.stdout) stdout = e.stdout;
      else throw e;
    }

    if (!stdout.trim()) {
      return { scanner: 'aipatterns', ok: true, findings: [], durationMs: Date.now() - start };
    }

    parseFindings(stdout, findings);
    return { scanner: 'aipatterns', ok: true, findings, durationMs: Date.now() - start };
  } catch (error: any) {
    return { scanner: 'aipatterns', ok: false, findings: [], error: error.message, durationMs: Date.now() - start };
  }
}

function buildConfigArgs(stack: StackInfo, baseRulesDir: string): string[] {
  const args = ['--config', join(baseRulesDir, 'core')];
  if (stack.hasTypeScript) args.push('--config', join(baseRulesDir, 'languages', 'typescript.yml'));
  if (stack.hasReact) args.push('--config', join(baseRulesDir, 'frameworks', 'react.yml'));
  if (stack.hasNextJs) args.push('--config', join(baseRulesDir, 'frameworks', 'nextjs.yml'));
  if (stack.hasNestJs) args.push('--config', join(baseRulesDir, 'frameworks', 'nestjs.yml'));
  if (stack.hasExpress) args.push('--config', join(baseRulesDir, 'frameworks', 'express.yml'));
  if (stack.hasPython) args.push('--config', join(baseRulesDir, 'languages', 'python.yml'));
  if (stack.hasDjango) args.push('--config', join(baseRulesDir, 'frameworks', 'django.yml'));
  if (stack.hasGo) args.push('--config', join(baseRulesDir, 'languages', 'golang.yml'));
  return args;
}

function filterFiles(stagedFiles: string[] | undefined): string[] {
  if (!stagedFiles || stagedFiles.length === 0) return [];
  const DANGEROUS_SINKS = /\beval\s*\(|\bexec\s*\(|\bspawn\s*\(|dangerouslySetInnerHTML|innerHTML\s*=|child_process|\bpickle\.loads?\b|\bos\.system\b|\bsubprocess\.|\bunserialize\b/;
  const DANGEROUS_SOURCES = /\breq\.body\b|\breq\.query\b|\breq\.params\b|\brequest\.form\b|\bparams\[|\bgetParameter\(|process\.env\[|process\.argv\[/;
  const TAINT_FLOW = /\bpassword\s*=\s*(?!null|undefined|''|"")|\bsecret\s*=\s*(?!null|undefined|''|"")|\b(?:SELECT|INSERT|UPDATE|DELETE)\b.*\?/i;
  const MAX_FILE_SIZE = 512 * 1024;

  return stagedFiles.filter(file => {
    try {
      const stat = statSync(file);
      if (stat.size > MAX_FILE_SIZE) return false;
      const content = readFileSync(file, 'utf8');
      return DANGEROUS_SINKS.test(content) || DANGEROUS_SOURCES.test(content) || TAINT_FLOW.test(content);
    } catch {
      return true;
    }
  });
}

function parseFindings(stdout: string, findings: Finding[]) {
  const report = JSON.parse(stdout);
  if (report.errors?.length > 0) {
    for (const err of report.errors) {
      findings.push({
        id: `aipatterns-err-${randomUUID()}`,
        category: 'AI_CODE', severity: 'info', title: 'Semgrep scan error',
        file: err.path ?? 'unknown', rule: 'aipatterns-internal', scanner: 'aipatterns',
        description: err.message ?? JSON.stringify(err),
      });
    }
  }
  for (const res of report.results || []) {
    const cleanCheckId = res.check_id.includes('.') ? res.check_id.split('.').pop() || res.check_id : res.check_id;
    findings.push({
      id: `aipatterns-${randomUUID()}`,
      category: 'AI_CODE', severity: mapSeverity(res.extra.severity),
      title: `AI Code Pattern: ${cleanCheckId.replace('ai-', '')}`,
      file: res.path, line: res.start?.line, rule: cleanCheckId, scanner: 'aipatterns',
      description: res.extra.message,
    });
  }
}