import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, relative, resolve } from 'path';
import type { StackInfo } from './types.js';
import { detectStack } from './detect.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Workspace {
  /** Human-readable name: "frontend", "backend", "packages/api", etc. */
  name: string;
  /** Absolute path to the workspace root */
  dir: string;
  /** Per-workspace stack info */
  stack: StackInfo;
  /** Whether this is the repo root */
  isRoot: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_DEPTH = 3;

/** Directories that are never sub-workspaces */
const IGNORE_DIRS = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', 'vendor',
  '.cache', 'coverage', '.turbo', '.nx', '__pycache__', '.venv',
  'venv', 'env', '.env', 'target', 'out', '.output',
]);

/** Markers that indicate a directory is an independent package/service */
const WORKSPACE_MARKERS = [
  'package.json',
  'requirements.txt',
  'pyproject.toml',
  'Pipfile',
  'go.mod',
  'Cargo.toml',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Read npm/yarn/pnpm workspaces globs from a root package.json.
 * Returns resolved absolute paths of declared workspace dirs.
 */
function readNpmWorkspacePaths(rootDir: string): string[] {
  const pkgPath = join(rootDir, 'package.json');
  if (!existsSync(pkgPath)) return [];

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const globs: string[] = Array.isArray(pkg.workspaces)
      ? pkg.workspaces
      : Array.isArray(pkg.workspaces?.packages)
      ? pkg.workspaces.packages
      : [];

    const paths: string[] = [];
    for (const glob of globs) {
      // Support simple globs like "packages/*", "apps/*", "frontend"
      // We expand one level of wildcard manually to avoid a dependency on glob libs
      const withoutStar = glob.replace(/\/\*$/, '');
      const candidate = resolve(rootDir, withoutStar);
      if (glob.endsWith('/*')) {
        // Expand one level
        try {
          const entries = readdirSync(candidate, { withFileTypes: true });
          for (const e of entries) {
            if (e.isDirectory() && !IGNORE_DIRS.has(e.name)) {
              paths.push(join(candidate, e.name));
            }
          }
        } catch { /* dir may not exist yet */ }
      } else {
        if (existsSync(candidate)) paths.push(candidate);
      }
    }
    return paths;
  } catch {
    return [];
  }
}

/**
 * Recursively find directories that have at least one workspace marker file,
 * skipping ignored dirs and not going deeper than maxDepth.
 */
function findSubWorkspaceDirs(
  dir: string,
  rootDir: string,
  maxDepth: number,
  currentDepth = 0,
  found: string[] = [],
): string[] {
  if (currentDepth > maxDepth) return found;

  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    const fileNames = entries.filter(e => e.isFile()).map(e => e.name);
    const hasMarker = WORKSPACE_MARKERS.some(m => fileNames.includes(m));

    // A sub-directory (not root) with a marker is a workspace candidate
    if (currentDepth > 0 && hasMarker) {
      found.push(dir);
      // Don't recurse deeper into a found workspace to avoid nested false positives
      return found;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (IGNORE_DIRS.has(entry.name)) continue;
      findSubWorkspaceDirs(join(dir, entry.name), rootDir, maxDepth, currentDepth + 1, found);
    }
  } catch { /* ignore permission errors */ }

  return found;
}

/**
 * Derive a short, human-readable workspace name from an absolute path
 * relative to the root dir.
 */
function workspaceName(dir: string, rootDir: string): string {
  const rel = relative(rootDir, dir).replace(/\\/g, '/');
  return rel || 'root';
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Detects all workspaces in a monorepo (or single-package repo).
 *
 * Strategy:
 *  1. Check root package.json for npm/yarn/pnpm "workspaces" field
 *  2. Recursively scan for dirs with workspace marker files (package.json,
 *     requirements.txt, go.mod, etc.) up to depth 3
 *  3. Merge & deduplicate, always including root
 *  4. Compute per-workspace StackInfo via detectStack()
 *
 * For a simple single-package repo this returns exactly one workspace (root),
 * ensuring zero regression.
 */
export function detectWorkspaces(rootDir: string, rootStack: StackInfo): Workspace[] {
  const allDirs = new Set<string>();

  // Strategy 1: npm/yarn/pnpm workspaces field
  for (const p of readNpmWorkspacePaths(rootDir)) {
    allDirs.add(resolve(p));
  }

  // Strategy 2: recursive file scan
  for (const p of findSubWorkspaceDirs(rootDir, rootDir, MAX_DEPTH)) {
    allDirs.add(resolve(p));
  }

  // Remove root from sub-workspace set (root is always added separately)
  allDirs.delete(resolve(rootDir));

  // If no sub-workspaces found → single-package repo, return root only
  if (allDirs.size === 0) {
    return [{ name: 'root', dir: rootDir, stack: rootStack, isRoot: true }];
  }

  const workspaces: Workspace[] = [];

  // Always add root workspace first
  workspaces.push({
    name: 'root',
    dir: rootDir,
    stack: rootStack,
    isRoot: true,
  });

  // Add each discovered sub-workspace with its own stack
  for (const dir of [...allDirs].sort()) {
    const name = workspaceName(dir, rootDir);
    try {
      const stack = detectStack(dir);
      workspaces.push({ name, dir, stack, isRoot: false });
    } catch {
      // If stack detection fails for a sub-dir, skip it gracefully
    }
  }

  return workspaces;
}

/**
 * Returns true if this is a genuine monorepo (more than just root).
 */
export function isMonorepo(workspaces: Workspace[]): boolean {
  return workspaces.length > 1;
}

/**
 * Returns all non-root workspaces.
 */
export function getSubWorkspaces(workspaces: Workspace[]): Workspace[] {
  return workspaces.filter(w => !w.isRoot);
}
