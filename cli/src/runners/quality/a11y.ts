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

// ─── Runner ───────────────────────────────────────────────────────────────────

/**
 * Runs `eslint` with `eslint-plugin-jsx-a11y` against the target directory.
 * Only surfaces accessibility-related rule violations as A11Y findings.
 */
export async function runA11y(targetDir: string, stagedFiles?: string[]): Promise<ScanResult> {
  const start = Date.now();
  const scanner = 'jsx-a11y';

  const handleEslintError = (err: any) => {
    if (err.stdout) return { stdout: err.stdout as string };
    if (err.message && err.message.includes('eslint.config.js')) {
      return {
        stdout: JSON.stringify([{
          messages: [{
            ruleId: 'auditx/eslint-flat-config',
            severity: 1,
            message: 'ESLint 9 Flat Config detected. auditx a11y plugin injection is currently unsupported for this repo.',
            line: 1
          }],
          filePath: 'eslint.config.js'
        }])
      };
    }
    throw err;
  };

  try {
    const eslintCacheDir = join(homedir(), '.auditx', 'a11y-deps');
    const eslintJs = join(eslintCacheDir, 'node_modules', 'eslint', 'bin', 'eslint.js');

    if (!existsSync(eslintJs)) {
      if (!existsSync(eslintCacheDir)) {
        mkdirSync(eslintCacheDir, { recursive: true });
      }
      writeFileSync(join(eslintCacheDir, 'package.json'), JSON.stringify({ name: "auditx-a11y-deps", version: "1.0.0" }));
      const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      execFileSync(npmBin, ['install', 'eslint@8', 'eslint-plugin-jsx-a11y'], { cwd: eslintCacheDir, stdio: 'ignore', shell: process.platform === 'win32' });
    }

    // Write a temporary config file that extends jsx-a11y/recommended
    const configPath = join(eslintCacheDir, '.eslintrc.json');
    writeFileSync(configPath, JSON.stringify({
      plugins: ["jsx-a11y"],
      extends: ["plugin:jsx-a11y/recommended"],
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: { jsx: true }
      },
      env: { browser: true, es2021: true }
    }));

    const args = [
      '--format', 'json',
      '--config', configPath,
      '--no-error-on-unmatched-pattern',
      '--cache',
      '--cache-location', 'node_modules/.cache/auditx/a11y/',
      '--resolve-plugins-relative-to', eslintCacheDir,
      '--ext', '.jsx,.tsx',
    ];
    const report: EslintFileResult[] = [];

    // Batching to prevent E2BIG on massive repos
    if (stagedFiles && stagedFiles.length > 0) {
      // Filter staged files to only jsx/tsx
      const reactFiles = stagedFiles.filter(f => f.endsWith('.jsx') || f.endsWith('.tsx'));
      if (reactFiles.length > 0) {
        const CHUNK_SIZE = 500;
        for (let i = 0; i < reactFiles.length; i += CHUNK_SIZE) {
          const chunk = reactFiles.slice(i, i + CHUNK_SIZE);
          const chunkArgs = [eslintJs, ...args, ...chunk];
          const result = await execFileAsync(process.execPath, chunkArgs, { cwd: targetDir, maxBuffer: 20 * 1024 * 1024 }).catch(handleEslintError);
          report.push(...JSON.parse(result.stdout || '[]'));
        }
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
        // Only include jsx-a11y related rules
        if (!msg.ruleId.startsWith('jsx-a11y/')) continue;

        findings.push({
          id: '',
          category: 'A11Y',
          severity: msg.severity === 2 ? 'high' : 'medium',
          title: msg.message.slice(0, 120),
          file: fileResult.filePath,
          line: msg.line,
          rule: msg.ruleId,
          scanner,
          description: `Accessibility rule '${msg.ruleId}' violation`,
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
