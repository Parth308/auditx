import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { Finding, ScanResult } from '../../types.js';
import { getBinaryPath } from '../../installer.js';

const execFileAsync = promisify(execFile);

export async function runTrufflehog(targetDir: string): Promise<ScanResult> {
  const start = Date.now();
  const scanner = 'trufflehog';

  try {
    const bin = await getBinaryPath('trufflehog');
    
    // trufflehog filesystem <dir> --json --verify
    // It outputs NDJSON (newline-delimited JSON) to stdout
    let stdout = '';
    let stderr = '';
    
    // Create a temporary exclude file to ignore node_modules and other slow dirs
    const tmpExclude = join(tmpdir(), `thog-exclude-${Date.now()}.txt`);
    writeFileSync(tmpExclude, '.*node_modules.*\\n.*\\.git.*\\n.*dist.*\\n.*build.*\\n', 'utf8');
    
    try {
      const res = await execFileAsync(
        bin,
        ['filesystem', targetDir, '--json', '--verify', '--no-update', '--exclude-paths', tmpExclude],
        { maxBuffer: 50 * 1024 * 1024 }
      );
      stdout = res.stdout;
      stderr = res.stderr;
    } catch (err: any) {
      // TruffleHog exits with 1 if secrets are found
      if (err.stdout) stdout = err.stdout;
      if (err.stderr) stderr = err.stderr;
    }

    const lines = stdout.split('\n').filter(Boolean);
    const findings: Finding[] = [];

    for (const line of lines) {
      try {
        const item = JSON.parse(line);
        if (!item.DetectorName) continue; // Skip non-finding logs
        
        const isVerified = item.Verified === true;
        const severity = isVerified ? 'critical' : 'info'; // Unverified secrets are just info
        
        const file = item.SourceMetadata?.Data?.Filesystem?.file || 'unknown';
        const lineNum = item.SourceMetadata?.Data?.Filesystem?.line || 0;
        
        findings.push({
          id: '',
          category: 'SECRETS',
          severity,
          title: `${isVerified ? '[LIVE] ' : ''}Secret detected: ${item.DetectorName}`,
          file,
          line: lineNum > 0 ? lineNum : undefined,
          rule: item.DetectorName,
          scanner,
          description: isVerified 
            ? `ACTIVE SECRET VERIFIED via ${item.DetectorName} API! This key is currently live and vulnerable.`
            : `Unverified/dead secret matched ${item.DetectorName} pattern.`,
          match: item.Raw ? redact(item.Raw) : undefined,
          fix: isVerified 
            ? `URGENT: Rotate this ${item.DetectorName} credential immediately in the provider dashboard, then remove it from code.`
            : 'Remove from source code and use environment variables.',
        });
      } catch {
        // Skip lines that aren't valid JSON
      }
    }

    return { scanner, ok: true, findings, durationMs: Date.now() - start };
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return {
        scanner,
        ok: false,
        findings: [],
        error: 'trufflehog not found',
        durationMs: Date.now() - start,
      };
    }

    return {
      scanner,
      ok: false,
      findings: [],
      error: String(err.message),
      durationMs: Date.now() - start,
    };
  }
}

function redact(match: string): string {
  if (match.length <= 6) return '***';
  return match.slice(0, 3) + '*'.repeat(match.length - 6) + match.slice(-3);
}
