import type { Config, ScanResult, StackInfo } from '../types.js';
import { runSemgrep } from './security/semgrep.js';
import { runTrivy } from './security/trivy.js';
import { runNpmAudit } from './security/npmaudit.js';
import { runGitleaks } from './security/gitleaks.js';
import { runKnip } from './quality/knip.js';
import { runEslint } from './quality/eslint.js';
import { runJscpd } from './quality/jscpd.js';
import { runDepcheck } from './health/depcheck.js';
import { runLicenseChecker } from './health/license.js';
import { runTypecheck } from './quality/typecheck.js';
import { runGitHealth } from './health/githealth.js';
import { runLizard } from './quality/lizard.js';
import { runAiPatterns } from './ai/aipatterns.js';
import { runIaC } from './security/iac.js';

export type RunnerName = 'secrets' | 'deps' | 'sast' | 'deadcode' | 'iac' | 'patterns' | 'duplication' | 'complexity' | 'dephealth' | 'license' | 'aicode' | 'githealth' | 'typesafety';

interface RunnerDef {
  name: RunnerName;
  label: string;
  run: (targetDir: string, stagedFiles: string[] | undefined, stack: StackInfo) => Promise<ScanResult>;
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
    name: 'iac',
    label: 'trivy (IaC)',
    run: runIaC,
    isApplicable: (s) => s.hasTerraform || s.hasDocker || s.hasGit, // Trivy config scans kubernetes manifests, terraform, dockerfiles
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
  {
    name: 'aicode',
    label: 'semgrep (ai patterns)',
    run: runAiPatterns,
    isApplicable: (s) => s.hasNodeJs || s.hasTypeScript,
  },
  {
    name: 'complexity',
    label: 'lizard (complexity)',
    run: runLizard,
    isApplicable: () => true,
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

  const semgrepNames = new Set(['sast', 'aicode']);
  const otherRunners = selected.filter((r) => !semgrepNames.has(r.name));
  const semgrepRunners = selected.filter((r) => semgrepNames.has(r.name));

  const results: ScanResult[] = [];

  const runAndReport = async (runner: (typeof RUNNERS)[0]) => {
    try {
      const result = await runner.run(targetDir, config.stagedFiles, stack);
      onProgress?.({
        label: runner.label,
        status: result.ok ? 'done' : 'failed',
        durationMs: result.durationMs,
        error: result.error,
      });
      return result;
    } catch (e: any) {
      const errRes: ScanResult = {
        scanner: runner.name,
        ok: false,
        findings: [],
        error: String(e),
        durationMs: 0,
      };
      onProgress?.({
        label: runner.label,
        status: 'failed',
        durationMs: 0,
        error: String(e),
      });
      return errRes;
    }
  };

  // Run all other scanners in parallel
  const otherPromises = otherRunners.map(runAndReport);
  
  // Wait for other runners to finish? No, start them parallel
  
  // Run semgrep scanners sequentially to avoid CPU fight
  const semgrepPromises = (async () => {
    const res: ScanResult[] = [];
    for (const runner of semgrepRunners) {
      res.push(await runAndReport(runner));
    }
    return res;
  })();

  const otherResults = await Promise.all(otherPromises);
  const semgrepResults = await semgrepPromises;

  results.push(...otherResults, ...semgrepResults);
  return results;
}

/** Returns a list of all runner labels applicable to the given stack. */
export function getApplicableRunnerLabels(stack: StackInfo, config: Config): string[] {
  const skip = new Set(config.skip);
  return RUNNERS.filter((r) => !skip.has(r.name) && r.isApplicable(stack)).map(
    (r) => r.label,
  );
}
