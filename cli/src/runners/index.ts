import type { Config, ScanResult, StackInfo } from '../types.js';
import { runGitleaks } from './gitleaks.js';
import { runTrivy } from './trivy.js';
import { runNpmAudit } from './npmaudit.js';
import { runSemgrep } from './semgrep.js';
import { runKnip } from './knip.js';
import { runEslint } from './eslint.js';
import { runJscpd } from './jscpd.js';
import { runDepcheck } from './depcheck.js';
import { runLicenseChecker } from './license.js';
import { runTypecheck } from './typecheck.js';
import { runGitHealth } from './githealth.js';

export type RunnerName = 'secrets' | 'deps' | 'sast' | 'deadcode' | 'iac' | 'patterns' | 'duplication' | 'complexity' | 'dephealth' | 'license' | 'aicode' | 'githealth' | 'typesafety';

interface RunnerDef {
  name: RunnerName;
  label: string;
  run: (targetDir: string) => Promise<ScanResult>;
  /** Returns true if this runner is applicable for the detected stack */
  isApplicable: (stack: StackInfo) => boolean;
}

/** All registered runners. Order matters for display purposes. */
const RUNNERS: RunnerDef[] = [
  {
    name: 'secrets',
    label: 'gitleaks (secrets)',
    run: runGitleaks,
    isApplicable: (s) => s.hasGit,
  },
  {
    name: 'deps',
    label: 'trivy (deps/CVEs)',
    run: runTrivy,
    isApplicable: () => true, // trivy handles all ecosystems
  },
  {
    name: 'deps',
    label: 'npm-audit (deps)',
    run: runNpmAudit,
    isApplicable: (s) => s.hasNodeJs,
  },
  {
    name: 'sast',
    label: 'semgrep (SAST)',
    run: runSemgrep,
    isApplicable: () => true,
  },
  {
    name: 'deadcode',
    label: 'knip (dead code)',
    run: runKnip,
    isApplicable: (s) => s.hasNodeJs,
  },
  {
    name: 'patterns',
    label: 'eslint (security patterns)',
    run: runEslint,
    isApplicable: (s) => s.hasNodeJs,
  },
  {
    name: 'duplication',
    label: 'jscpd (code duplication)',
    run: runJscpd,
    isApplicable: () => true, // jscpd is polyglot
  },
  {
    name: 'dephealth',
    label: 'depcheck (unused dependencies)',
    run: runDepcheck,
    isApplicable: (s) => s.hasNodeJs,
  },
  {
    name: 'license',
    label: 'license-checker (licenses)',
    run: runLicenseChecker,
    isApplicable: (s) => s.hasNodeJs,
  },
  {
    name: 'typesafety',
    label: 'tsc (typescript compiler)',
    run: runTypecheck,
    isApplicable: (s) => s.hasTypeScript,
  },
  {
    name: 'githealth',
    label: 'git log (hotspots)',
    run: runGitHealth,
    isApplicable: (s) => s.hasGit,
  },
];

export interface RunnerProgress {
  label: string;
  status: 'running' | 'done' | 'skipped' | 'failed';
  durationMs?: number;
  error?: string;
}

/**
 * Runs all applicable runners in parallel using Promise.allSettled.
 * Runners that aren't applicable to the stack or are explicitly skipped
 * are omitted. Individual runner failures never crash the whole scan.
 *
 * @param onProgress - called whenever a runner finishes, for live terminal updates
 */
export async function runAll(
  targetDir: string,
  stack: StackInfo,
  config: Config,
  onProgress?: (progress: RunnerProgress) => void,
): Promise<ScanResult[]> {
  const skip = new Set(config.skip);

  // Select applicable and non-skipped runners
  const selected = RUNNERS.filter((r) => {
    if (skip.has(r.name)) return false;
    if (!r.isApplicable(stack)) return false;
    return true;
  });

  // Run all in parallel
  const settled = await Promise.allSettled(
    selected.map(async (runner) => {
      const result = await runner.run(targetDir);
      onProgress?.({
        label: runner.label,
        status: result.ok ? 'done' : 'failed',
        durationMs: result.durationMs,
        error: result.error,
      });
      return result;
    }),
  );

  const results: ScanResult[] = [];
  for (const outcome of settled) {
    if (outcome.status === 'fulfilled') {
      results.push(outcome.value);
    } else {
      // Unexpected rejection (shouldn't happen since runners catch internally)
      results.push({
        scanner: 'unknown',
        ok: false,
        findings: [],
        error: String(outcome.reason),
        durationMs: 0,
      });
    }
  }

  return results;
}

/** Returns a list of all runner labels applicable to the given stack. */
export function getApplicableRunnerLabels(stack: StackInfo, config: Config): string[] {
  const skip = new Set(config.skip);
  return RUNNERS.filter((r) => !skip.has(r.name) && r.isApplicable(stack)).map(
    (r) => r.label,
  );
}
