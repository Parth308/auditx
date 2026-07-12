import type { Config, ScanResult, StackInfo } from '../types.js';
import { runSemgrep } from './security/semgrep.js';
import { runTrivy } from './security/trivy.js';
import { runNpmAudit } from './security/npmaudit.js';
import { runGitleaks } from './security/gitleaks.js';
import { runTrufflehog } from './security/trufflehog.js';
import { runOsvScanner } from './security/osv.js';
import { runShellcheck } from './security/shellcheck.js';
import { runKnip } from './quality/knip.js';
import { runCspell } from './quality/cspell.js';
import { runEslint } from './quality/eslint.js';
import { runJscpd } from './quality/jscpd.js';
import { runDepcheck } from './health/depcheck.js';
import { runLicenseChecker } from './health/license.js';
import { runTypecheck } from './quality/typecheck.js';
import { runGitHealth } from './health/githealth.js';
import { runNpmOutdated } from './health/npmoutdated.js';
import { runLizard } from './quality/lizard.js';
import { runAiPatterns } from './ai/aipatterns.js';
import { runIaC } from './security/iac.js';
import { runSupplychain } from './security/supplychain.js';
import { Orchestrator, type TaskCost } from './orchestrator.js';

type RunnerName = 'secrets' | 'deps' | 'sast' | 'deadcode' | 'iac' | 'patterns' | 'duplication' | 'complexity' | 'dephealth' | 'license' | 'aicode' | 'githealth' | 'typesafety' | 'supplychain' | 'outdated';

interface RunnerDef {
  name: RunnerName;
  label: string;
  cost: TaskCost;
  run: (targetDir: string, stagedFiles: string[] | undefined, stack: StackInfo) => Promise<ScanResult>;
  /** Returns true if this runner is applicable for the detected stack */
  isApplicable: (stack: StackInfo) => boolean;
}

/** All registered runners. Order matters for display purposes. */
const RUNNERS: RunnerDef[] = [
  {
    name: 'secrets',
    label: 'gitleaks (secrets)',
    cost: 1,
    run: runGitleaks,
    isApplicable: (s) => s.hasGit,
  },
  {
    name: 'secrets',
    label: 'trufflehog (active validation)',
    cost: 1,
    run: runTrufflehog,
    isApplicable: () => true, // TruffleHog works on raw filesystem
  },
  {
    name: 'deps',
    label: 'trivy (deps/CVEs)',
    cost: 3,
    run: runTrivy,
    isApplicable: () => true, // trivy handles all ecosystems
  },
  {
    name: 'deps',
    label: 'osv-scanner (Google OSV)',
    cost: 2,
    run: runOsvScanner,
    isApplicable: () => true,
  },
  {
    name: 'iac',
    label: 'trivy (IaC)',
    cost: 2,
    run: runIaC,
    isApplicable: (s) => s.hasTerraform || s.hasDocker || s.hasGit,
  },
  {
    name: 'deps',
    label: 'npm-audit (deps)',
    cost: 1,
    run: runNpmAudit,
    isApplicable: (s) => s.hasNodeJs,
  },
  {
    name: 'sast',
    label: 'semgrep (SAST)',
    cost: 3,
    run: runSemgrep,
    isApplicable: () => true,
  },
  {
    name: 'sast',
    label: 'shellcheck (bash scripts)',
    cost: 1,
    run: runShellcheck,
    isApplicable: () => true,
  },
  {
    name: 'deadcode',
    label: 'knip (dead code)',
    cost: 2,
    run: runKnip,
    isApplicable: (s) => s.hasNodeJs,
  },
  {
    name: 'patterns',
    label: 'eslint (security patterns)',
    cost: 2,
    run: runEslint,
    isApplicable: (s) => s.hasNodeJs,
  },
  {
    name: 'duplication',
    label: 'jscpd (code duplication)',
    cost: 1,
    run: runJscpd,
    isApplicable: () => true, // jscpd is polyglot
  },
  {
    name: 'dephealth',
    label: 'depcheck (unused dependencies)',
    cost: 1,
    run: runDepcheck,
    isApplicable: (s) => s.hasNodeJs,
  },
  {
    name: 'outdated',
    label: 'npm-outdated (outdated dependencies)',
    cost: 1,
    run: runNpmOutdated,
    isApplicable: (s) => s.hasNodeJs,
  },
  {
    name: 'license',
    label: 'license-checker (licenses)',
    cost: 1,
    run: runLicenseChecker,
    isApplicable: (s) => s.hasNodeJs,
  },
  {
    name: 'typesafety',
    label: 'tsc (typescript compiler)',
    cost: 2,
    run: runTypecheck,
    isApplicable: (s) => s.hasTypeScript,
  },
  {
    name: 'githealth',
    label: 'git log (hotspots)',
    cost: 1,
    run: runGitHealth,
    isApplicable: (s) => s.hasGit,
  },
  {
    name: 'aicode',
    label: 'semgrep (ai patterns)',
    cost: 3,
    run: runAiPatterns,
    isApplicable: (s) => s.hasNodeJs || s.hasTypeScript || s.hasPython || s.hasGo || s.hasSql || s.hasReact || s.hasNextJs || s.hasDjango || s.hasExpress || s.hasNestJs,
  },
  {
    name: 'complexity',
    label: 'lizard (complexity)',
    cost: 2,
    run: runLizard,
    isApplicable: () => true,
  },
  {
    name: 'patterns',
    label: 'cspell (code spelling)',
    cost: 2,
    run: runCspell,
    isApplicable: () => true,
  },
  {
    name: 'supplychain',
    label: 'supplychain (malware heuristics)',
    cost: 2,
    run: runSupplychain,
    isApplicable: (s) => s.hasNodeJs,
  },
];

export interface RunnerProgress {
  label: string;
  status: 'running' | 'done' | 'skipped' | 'failed';
  durationMs?: number;
  error?: string;
}

/**
 * Runs all applicable runners using the Orchestrator for concurrency control.
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

  // LPT (Longest-Processing-Time-First) Scheduling: 
  // Sort tasks by cost descending so the heaviest tasks start first.
  selected.sort((a, b) => b.cost - a.cost);

  const orchestrator = new Orchestrator<ScanResult>();

  const runAndReport = async (runner: RunnerDef): Promise<ScanResult> => {
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

  const tasks = selected.map((runner) => {
    return orchestrator.enqueue({
      id: runner.name,
      cost: runner.cost,
      execute: () => runAndReport(runner),
    });
  });

  return await Promise.all(tasks);
}

/** Returns a list of all runner labels applicable to the given stack. */
export function getApplicableRunnerLabels(stack: StackInfo, config: Config): string[] {
  const skip = new Set(config.skip);
  return RUNNERS.filter((r) => !skip.has(r.name) && r.isApplicable(stack)).map(
    (r) => r.label,
  );
}
