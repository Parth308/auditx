import { execFile, execFileSync } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import type { Finding, ScanResult } from '../../types.js';

const execFileAsync = promisify(execFile);

// ─── ESLint JSON output types ─────────────────────────────────────────────────

interface EslintMessage {
  ruleId: string | null;
  severity: 1 | 2;
  message: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  fix?: { range: [number, number]; text: string };
  suggestions?: Array<{ messageId: string; fix: { range: [number, number]; text: string } }>;
}

interface EslintFileResult {
  filePath: string;
  messages: EslintMessage[];
  errorCount: number;
  warningCount: number;
  fixableErrorCount: number;
  fixableWarningCount: number;
}

// ─── Security-focused ESLint rules ───────────────────────────────────────────

const SECURITY_RULES = new Set([
  'no-eval',
  'no-implied-eval',
  'security/detect-eval-with-expression',
  'security/detect-non-literal-regexp',
  'security/detect-non-literal-require',
  'security/detect-non-literal-fs-filename',
  'security/detect-unsafe-regex',
  'security/detect-buffer-noassert',
  'security/detect-child-process',
  'security/detect-disable-mustache-escape',
  'security/detect-new-buffer',
  'security/detect-no-csrf-before-method-override',
  'security/detect-object-injection',
  'security/detect-possible-timing-attacks',
  'security/detect-pseudoRandomBytes',
]);

// ─── Runner ───────────────────────────────────────────────────────────────────

/**
 * Runs `eslint` with `eslint-plugin-security` against the target directory.
 * Only surfaces security-related rule violations as PATTERNS findings.
 */
export async function runEslint(targetDir: string, stagedFiles?: string[]): Promise<ScanResult> {
  const start = Date.now();
  const scanner = 'eslint';

  const handleEslintError = (err: any) => {
    if (err.stdout) return { stdout: err.stdout as string };
    if (err.message && err.message.includes('eslint.config.js')) {
      return {
        stdout: JSON.stringify([{
          messages: [{
            ruleId: 'auditx/eslint-flat-config',
            severity: 1,
            message: 'ESLint 9 Flat Config detected. auditx security plugin injection is currently unsupported for this repo.',
            line: 1
          }],
          filePath: 'eslint.config.js'
        }])
      };
    }
    throw err;
  };

  try {
    const eslintCacheDir = join(homedir(), '.auditx', 'eslint-deps');
    const eslintJs = join(eslintCacheDir, 'node_modules', 'eslint', 'bin', 'eslint.js');

    if (!existsSync(eslintJs)) {
      if (!existsSync(eslintCacheDir)) {
        mkdirSync(eslintCacheDir, { recursive: true });
      }
      writeFileSync(join(eslintCacheDir, 'package.json'), JSON.stringify({ name: "auditx-eslint-deps", version: "1.0.0" }));
      const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      execFileSync(npmBin, ['install', 'eslint@8', 'eslint-plugin-security'], { cwd: eslintCacheDir, stdio: 'ignore', shell: process.platform === 'win32' });
    }

    const args = [
      '--format', 'json',
      '--no-eslintrc',
      '--no-error-on-unmatched-pattern',
      '--cache',
      '--cache-location', 'node_modules/.cache/auditx/eslint/',
      '--resolve-plugins-relative-to', eslintCacheDir,
      '--plugin', 'security',
      '--rule', JSON.stringify(buildSecurityRules()),
      '--ext', '.js,.ts,.jsx,.tsx,.mjs,.cjs',
      '--ignore-pattern', '**/node_modules/**',
      '--ignore-pattern', '**/dist/**',
      '--ignore-pattern', '**/build/**',
      '--ignore-pattern', '**/coverage/**',
    ];
    const report: EslintFileResult[] = [];

    // Batching to prevent E2BIG on massive repos
    if (stagedFiles && stagedFiles.length > 0) {
      const maxCommandLength = 7000;
      let currentChunk: string[] = [];
      let currentLength = 0;

      const processEslintRun = async (chunk: string[]) => {
        const chunkArgs = [eslintJs, ...args, ...chunk];
        const result = await execFileAsync(process.execPath, chunkArgs, { cwd: targetDir, maxBuffer: 20 * 1024 * 1024 }).catch(handleEslintError);
        report.push(...JSON.parse(result.stdout || '[]'));
      };

      for (const file of stagedFiles) {
        const estimateLen = file.length + 3;
        if (currentChunk.length > 0 && currentLength + estimateLen > maxCommandLength) {
          await processEslintRun(currentChunk);
          currentChunk = [];
          currentLength = 0;
        }
        currentChunk.push(file);
        currentLength += estimateLen;
      }
      if (currentChunk.length > 0) {
        await processEslintRun(currentChunk);
      }
    } else {
      const chunkArgs = [eslintJs, ...args, '.'];
      const result = await execFileAsync(process.execPath, chunkArgs, { cwd: targetDir, maxBuffer: 20 * 1024 * 1024 }).catch(handleEslintError);
      report.push(...JSON.parse(result.stdout || '[]'));
    }
    const findings: Finding[] = [];

    for (const fileResult of report) {
      for (const msg of fileResult.messages) {
        if (!msg.ruleId) continue;
        // Only include security-related rules
        if (!isSecurityRule(msg.ruleId)) continue;

        findings.push({
          id: '',
          category: 'PATTERNS',
          severity: msg.severity === 2 ? 'high' : 'medium',
          title: msg.message.slice(0, 120),
          file: fileResult.filePath,
          line: msg.line,
          rule: msg.ruleId,
          scanner,
          description: `ESLint rule '${msg.ruleId}' violation`,
          fix: msg.fix
            ? 'Auto-fixable. Run: npx eslint --fix'
            : undefined,
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

function isSecurityRule(ruleId: string): boolean {
  return SECURITY_RULES.has(ruleId) || ruleId.startsWith('security/');
}

function buildSecurityRules(): Record<string, 'error' | 'warn'> {
  return {
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-non-literal-require': 'warn',
    'security/detect-non-literal-fs-filename': 'warn',
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'warn',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-new-buffer': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-object-injection': 'warn',
    'security/detect-possible-timing-attacks': 'warn',
    'security/detect-pseudoRandomBytes': 'error',
  };
}
