import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type { Finding, ScanResult } from '../../types.js';
import { getBinaryPath } from '../../installer.js';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

export async function runAiPatterns(targetPath: string): Promise<ScanResult> {
  const start = Date.now();
  const findings: Finding[] = [];

  try {
    const semgrepBin = await getBinaryPath('semgrep');
    // We assume the rules are placed next to the built binary, or we can use __dirname to locate it.
    // In dev, it's cli/src/rules/ai-patterns.yml. In dist, it might need to be copied.
    // A robust way for a CLI is to package the rule inside the npm package and resolve it:
    const rulesPath = new URL('../src/rules/ai-patterns.yml', import.meta.url).pathname;
    const devRulesPath = new URL('../rules/ai-patterns.yml', import.meta.url).pathname;
    
    // Windows URL pathnames start with /C:/... we need to trim the leading slash
    let cleanRulesPath = process.platform === 'win32' && rulesPath.startsWith('/') ? rulesPath.slice(1) : rulesPath;
    const cleanDevRulesPath = process.platform === 'win32' && devRulesPath.startsWith('/') ? devRulesPath.slice(1) : devRulesPath;

    if (!existsSync(cleanRulesPath) && existsSync(cleanDevRulesPath)) {
      cleanRulesPath = cleanDevRulesPath;
    }

    let stdout = '';
    try {
      const cmd = `"${semgrepBin}" scan --config "${cleanRulesPath}" --json "${targetPath}"`;
      console.log('RUNNING:', cmd);
      const result = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
      stdout = result.stdout;
    } catch (e: any) {
      if (e.stdout) {
        stdout = e.stdout;
      } else {
        throw e;
      }
    }

    if (!stdout.trim()) {
      return { scanner: 'aipatterns', ok: true, findings: [], durationMs: Date.now() - start };
    }

    const report = JSON.parse(stdout);

    for (const res of report.results || []) {
      findings.push({
        id: `aipatterns-${randomUUID()}`,
        category: 'AI_CODE',
        severity: res.extra.severity === 'WARNING' || res.extra.severity === 'ERROR' ? 'medium' : 'info',
        title: `AI Code Pattern: ${res.check_id.replace('ai-', '')}`,
        file: res.path,
        line: res.start?.line,
        rule: res.check_id,
        scanner: 'aipatterns',
        description: res.extra.message,
      });
    }

    return {
      scanner: 'aipatterns',
      ok: true,
      findings,
      durationMs: Date.now() - start,
    };
  } catch (error: any) {
    return {
      scanner: 'aipatterns',
      ok: false,
      findings: [],
      error: error.message,
      durationMs: Date.now() - start,
    };
  }
}
