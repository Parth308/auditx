import { execFile } from 'child_process';
import { promisify } from 'util';
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
    const args = [
      '--package', 'eslint@8',
      '--package', 'eslint-plugin-security',
      '--',
      'eslint',
      '--format', 'json',
      '--no-eslintrc',
      '--no-error-on-unmatched-pattern',
      '--cache',
      '--cache-location', 'node_modules/.cache/auditx/eslint/',
      '--plugin', 'security',
      '--rule', JSON.stringify(buildSecurityRules()),
      '--ext', '.js,.ts,.jsx,.tsx,.mjs,.cjs',
    ];
    const npxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const report: EslintFileResult[] = [];

    // Batching to prevent E2BIG on massive repos
    if (stagedFiles && stagedFiles.length > 0) {
      const CHUNK_SIZE = 500;
      for (let i = 0; i < stagedFiles.length; i += CHUNK_SIZE) {
        const chunk = stagedFiles.slice(i, i + CHUNK_SIZE);
        const chunkArgs = [...args, ...chunk];
        const result = await execFileAsync(npxBin, ['--yes', ...chunkArgs], { cwd: targetDir, maxBuffer: 20 * 1024 * 1024, shell: process.platform === 'win32' }).catch(handleEslintError);
        report.push(...JSON.parse(result.stdout || '[]'));
      }
    } else {
      const chunkArgs = [...args, '.'];
      const result = await execFileAsync(npxBin, ['--yes', ...chunkArgs], { cwd: targetDir, maxBuffer: 20 * 1024 * 1024, shell: process.platform === 'win32' }).catch(handleEslintError);
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
