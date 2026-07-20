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
import { runTodoCheck } from './quality/todocheck.js';
import { runPrettierCheck } from './quality/prettier.js';
import { runLizard } from './quality/lizard.js';
import { runAiPatterns } from './ai/aipatterns.js';
import { runIaC } from './security/iac.js';
import { runSupplychain } from './security/supplychain.js';
import { runA11y } from './quality/a11y.js';
import { Orchestrator, type TaskCost } from './orchestrator.js';
import type { Workspace } from '../workspace.js';
import { existsSync } from 'fs';
import { join } from 'path';

type RunnerName = 'secrets' | 'deps' | 'sast' | 'deadcode' | 'iac' | 'patterns' | 'duplication' | 'complexity' | 'dephealth' | 'license' | 'aicode' | 'githealth' | 'typesafety' | 'supplychain' | 'outdated' | 'todocheck' | 'prettier' | 'a11y';

// ─── Runner definition ────────────────────────────────────────────────────────

interface RunnerDef {
  name: RunnerName;
  label: string;
  cost: TaskCost;
  run: (targetDir: string, stagedFiles: string[] | undefined, stack: StackInfo, workspaceName?: string) => Promise<ScanResult>;
  /** Returns true if this runner is applicable for the detected stack */
  isApplicable: (stack: StackInfo) => boolean;
}

// ─── Tier 1: Global runners ───────────────────────────────────────────────────
// Run ONCE against the root target dir. These tools traverse subdirs natively
// and don't need per-workspace awareness.

const GLOBAL_RUNNERS: RunnerDef[] = [
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
    isApplicable: () => true,
  },
  {
    name: 'deps',
    label: 'trivy (deps/CVEs)',
    cost: 3,
    run: runTrivy,
    isApplicable: () => true,
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
    name: 'duplication',
    label: 'jscpd (code duplication)',
    cost: 1,
    run: runJscpd,
    isApplicable: () => true,
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
    name: 'todocheck',
    label: 'leasot (TODOs/FIXMEs)',
    cost: 1,
    run: runTodoCheck,
    isApplicable: () => true,
  },
  {
    name: 'prettier',
    label: 'prettier (formatting)',
    cost: 1,
    run: runPrettierCheck,
    isApplicable: () => true,
  },
  {
    name: 'aicode',
    label: 'semgrep (ai patterns)',
    cost: 3,
    run: runAiPatterns,
    isApplicable: (s) => s.hasNodeJs || s.hasTypeScript || s.hasPython || s.hasGo || s.hasSql || s.hasReact || s.hasNextJs || s.hasDjango || s.hasExpress || s.hasNestJs,
  },
  {
    name: 'githealth',
    label: 'git log (hotspots)',
    cost: 1,
    run: runGitHealth,
    isApplicable: (s) => s.hasGit,
  },
];

// ─── Tier 2: Workspace-scoped runners ────────────────────────────────────────
// Run ONCE PER WORKSPACE. These tools need per-project context (package.json,
// tsconfig.json, etc.) and produce workspace-tagged findings.

const WORKSPACE_RUNNERS: RunnerDef[] = [
  {
    name: 'deps',
    label: 'npm-audit (deps)',
    cost: 1,
    run: runNpmAudit,
    isApplicable: (s) => s.hasNodeJs,
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
    name: 'a11y',
    label: 'jsx-a11y (accessibility)',
    cost: 1,
    run: runA11y,
    isApplicable: (s) => s.hasReact || s.hasNextJs,
  },
  {
    name: 'supplychain',
    label: 'supplychain (malware heuristics)',
    cost: 2,
    run: runSupplychain,
    isApplicable: (s) => s.hasNodeJs,
  },
];

// ─── Progress reporting ───────────────────────────────────────────────────────

export interface RunnerProgress {
  label: string;
  status: 'running' | 'done' | 'skipped' | 'failed';
  durationMs?: number;
  error?: string;
  /** Non-null when this runner ran for a specific workspace */
  workspace?: string;
}

// ─── Runner label helpers ─────────────────────────────────────────────────────

/** Returns a list of all applicable runner labels, including workspace-scoped expansions. */
export function getApplicableRunnerLabels(
  stack: StackInfo,
  config: Config,
  workspaces?: Workspace[],
): string[] {
  const skip = new Set(config.skip);
  const only = config.only && config.only.length > 0 ? new Set(config.only) : null;

  const filterRunner = (r: RunnerDef) => {
    if (only && !only.has(r.name)) return false;
    if (!only && skip.has(r.name)) return false;
    return r.isApplicable(stack);
  };

  const globalLabels = GLOBAL_RUNNERS.filter(filterRunner).map((r) => r.label);

  // For workspace runners, count once per applicable workspace
  const wsCount = workspaces && workspaces.length > 1 ? workspaces.length : 1;
  const wsLabels: string[] = [];
  for (const r of WORKSPACE_RUNNERS.filter(filterRunner)) {
    if (wsCount > 1) {
      wsLabels.push(`${r.label} ×${wsCount}`);
    } else {
      wsLabels.push(r.label);
    }
  }

  return [...globalLabels, ...wsLabels];
}

// ─── Core runAll ──────────────────────────────────────────────────────────────

/**
 * Runs all applicable runners using a shared Orchestrator for concurrency control.
 *
 * - Global runners run once against targetDir
 * - Workspace-scoped runners run once per workspace, tagged with workspace name
 *
 * @param onProgress - called whenever a runner finishes, for live terminal updates
 */
export async function runAll(
  targetDir: string,
  stack: StackInfo,
  workspaces: Workspace[],
  config: Config,
  onProgress?: (progress: RunnerProgress) => void,
): Promise<ScanResult[]> {
  const skip = new Set(config.skip);
  const only = config.only && config.only.length > 0 ? new Set(config.only) : null;

  const filterRunner = (r: RunnerDef, s: StackInfo) => {
    if (only && !only.has(r.name)) return false;
    if (!only && skip.has(r.name)) return false;
    if (!r.isApplicable(s)) return false;
    return true;
  };

  const orchestrator = new Orchestrator<ScanResult>();

  const makeTask = (
    runner: RunnerDef,
    dir: string,
    runnerStack: StackInfo,
    workspaceName: string | undefined,
  ) => {
    // For workspace-scoped runners in a monorepo, append workspace to label
    const displayLabel =
      workspaceName && workspaceName !== 'root'
        ? `${runner.label} [${workspaceName}]`
        : runner.label;

    return orchestrator.enqueue({
      id: `${runner.name}:${workspaceName ?? 'global'}`,
      cost: runner.cost,
      execute: async () => {
        try {
          const result = await runner.run(dir, config.stagedFiles, runnerStack, workspaceName);
          onProgress?.({
            label: displayLabel,
            status: result.ok ? 'done' : 'failed',
            durationMs: result.durationMs,
            error: result.error,
            workspace: workspaceName,
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
            label: displayLabel,
            status: 'failed',
            durationMs: 0,
            error: String(e),
            workspace: workspaceName,
          });
          return errRes;
        }
      },
    });
  };

  const tasks: Promise<ScanResult>[] = [];

  // ── Tier 1: Global runners (run once at root) ──────────────────────────────
  const selectedGlobal = GLOBAL_RUNNERS.filter((r) => filterRunner(r, stack));
  // LPT scheduling: heaviest first
  selectedGlobal.sort((a, b) => b.cost - a.cost);

  for (const runner of selectedGlobal) {
    tasks.push(makeTask(runner, targetDir, stack, undefined));
  }

  // ── Tier 2: Workspace-scoped runners (once per workspace) ─────────────────
  // Determine the effective workspace list. In a single-package repo, workspaces
  // is just [root] so these runners behave exactly as before.
  const isMonorepo = workspaces.length > 1;

  // Sort workspace runners by cost descending for LPT scheduling
  const selectedWsRunners = WORKSPACE_RUNNERS.filter((r) => filterRunner(r, stack));
  selectedWsRunners.sort((a, b) => b.cost - a.cost);

  for (const workspace of workspaces) {
    // Re-filter each runner against the per-workspace stack so e.g. the
    // pure-Python backend doesn't run npm-audit, and the React frontend
    // doesn't run tsc if it has no tsconfig.json.
    for (const runner of selectedWsRunners) {
      if (!filterRunner(runner, workspace.stack)) continue;

      // For npm-audit / depcheck / outdated: skip if no node_modules present in this workspace
      // (prevents "npm audit" failing on workspaces that haven't been installed yet)
      if (['deps', 'dephealth', 'outdated', 'license'].includes(runner.name)) {
        const hasNodeModules = existsSync(join(workspace.dir, 'node_modules'));
        if (!hasNodeModules) continue;
      }

      // For typecheck: skip if no tsconfig.json in this workspace dir
      if (runner.name === 'typesafety') {
        if (!existsSync(join(workspace.dir, 'tsconfig.json'))) continue;
      }

      // In a single-package repo (no monorepo), don't tag with workspace name
      const wsName = isMonorepo ? workspace.name : undefined;
      tasks.push(makeTask(runner, workspace.dir, workspace.stack, wsName));
    }
  }

  return await Promise.all(tasks);
}
