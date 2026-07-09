// ─────────────────────────────────────────────────────────────────────────────
// auditx — Dependency Reachability Analysis Engine
//
// Reduces false positives in DEPS findings by determining whether a vulnerable
// dependency is actually imported in the project's source code.
//
// Algorithm:
//  1. Parse package.json to collect all declared direct dependencies.
//  2. Walk all source files (.js/.ts/.tsx/.jsx/.mjs/.cjs) and extract every
//     'import ... from', dynamic import(), and require() call.
//  3. For monorepos, repeat step 1 for any workspace package.json files.
//  4. When queried with isReachable(pkgName):
//     - If pkgName is in usedImports → REACHABLE (package is actively used)
//     - If pkgName is in directDeps but NOT in usedImports → UNREACHABLE
//       (declared but never actually imported in source)
//     - If pkgName is NOT in directDeps → assume REACHABLE (transitive dep,
//       fail safe to avoid false negatives)
//
// Performance: Results are memoized per package name. Directory walk is done
// once lazily on first call to isReachable().
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

// ─── Regex patterns for import extraction ────────────────────────────────────
// Compiled once at module load for maximum performance.
const JS_IMPORT_PATTERNS = [
  // Static ESM: import foo from 'bar', import { a } from "b"
  /import\s+(?:[\w*{},\s]+\s+from\s+)?['"]([^'"]+)['"]/g,
  // Dynamic ESM: import('bar') or import("bar")
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  // CommonJS: require('bar') or require("bar")
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];

// Python import patterns
const PY_IMPORT_PATTERNS = [
  // import requests
  /^\s*import\s+([\w.]+)/gm,
  // from flask import ...
  /^\s*from\s+([\w.]+)\s+import/gm,
];

// Directories to always skip during the source walk
const SKIP_DIRS = new Set([
  'node_modules', 'dist', 'build', 'coverage', '.git', '.next', '.nuxt',
  '.svelte-kit', '.docusaurus', '.turbo', 'out', 'tmp', '.cache',
  '.parcel-cache', 'storybook-static', '__pycache__', '.venv', 'venv',
  'env', '.eggs', 'site-packages',
]);

// Source file extensions we care about
const SOURCE_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.py', // Python
]);

// ─── Normalize a raw import specifier to a package name ──────────────────────
function specifierToPackageName(specifier: string): string | null {
  // Ignore: relative paths, bare URLs, node built-ins, private paths
  if (
    specifier.startsWith('.') ||
    specifier.startsWith('/') ||
    specifier.startsWith('node:') ||
    specifier.startsWith('https:') ||
    specifier.startsWith('http:')
  ) {
    return null;
  }

  const parts = specifier.split('/');
  // Scoped package: @org/name
  if (specifier.startsWith('@') && parts.length >= 2) {
    return `${parts[0]}/${parts[1]}`;
  }
  // Regular package: first segment only (e.g. 'lodash/fp' → 'lodash')
  return parts[0];
}

// ─── ReachabilityEngine ───────────────────────────────────────────────────────
export class ReachabilityEngine {
  private readonly targetDir: string;

  /** All package names that appear in at least one import/require in source files */
  private usedImports = new Set<string>();
  /** All declared direct + dev + peer + optional dependencies */
  private directDeps = new Set<string>();
  /** Per-package memoization cache for isReachable() */
  private cache = new Map<string, boolean>();
  /** How many source files we scanned */
  private _scannedFiles = 0;

  private initialized = false;

  constructor(targetDir: string) {
    this.targetDir = targetDir;
  }

  // ─── Private: collect source files (recursive, skipping noise dirs) ──────
  private walkDir(dir: string, fileList: string[]): void {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // Permission denied or broken symlink — skip silently
    }

    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;

      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        this.walkDir(fullPath, fileList);
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase();
        if (SOURCE_EXTENSIONS.has(ext)) {
          fileList.push(fullPath);
        }
      }
    }
  }

  // ─── Private: extract import specifiers from a JS/TS file's content ─────────
  private extractJsImports(content: string): void {
    for (const pattern of JS_IMPORT_PATTERNS) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(content)) !== null) {
        const pkgName = specifierToPackageName(match[1]);
        if (pkgName) this.usedImports.add(pkgName);
      }
    }
  }

  // ─── Private: extract top-level module names from a Python file ───────────
  private extractPyImports(content: string): void {
    // 1. from <pkg> import ...
    const fromPattern = /^\s*from\s+([\w.]+)\s+import/gm;
    let match: RegExpExecArray | null;
    while ((match = fromPattern.exec(content)) !== null) {
      const topLevel = match[1].split('.')[0];
      if (topLevel) this.usedImports.add(topLevel.trim());
    }

    // 2. import <pkg1>, <pkg2>
    const importPattern = /^\s*import\s+([\w.,\s]+)/gm;
    while ((match = importPattern.exec(content)) !== null) {
      const parts = match[1].split(',');
      for (const part of parts) {
        const trimmed = part.trim();
        const topLevel = trimmed.split('.')[0];
        if (topLevel) this.usedImports.add(topLevel.trim());
      }
    }
  }

  // ─── Private: load dependencies from a single package.json ──────────────
  private loadDepsFromPkg(pkgPath: string): void {
    if (!existsSync(pkgPath)) return;
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      for (const group of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
        for (const dep of Object.keys((pkg[group] as object) || {})) {
          this.directDeps.add(dep);
        }
      }
    } catch {}
  }

  // ─── Private: resolve workspace packages for monorepos ───────────────────
  private loadWorkspaceDeps(): void {
    const rootPkg = join(this.targetDir, 'package.json');
    if (!existsSync(rootPkg)) return;

    let pkg: Record<string, unknown>;
    try {
      pkg = JSON.parse(readFileSync(rootPkg, 'utf8'));
    } catch {
      return;
    }

    const workspaces: string[] = [];
    if (Array.isArray(pkg.workspaces)) {
      workspaces.push(...pkg.workspaces as string[]);
    } else if (pkg.workspaces && typeof pkg.workspaces === 'object') {
      const ws = pkg.workspaces as { packages?: string[] };
      if (Array.isArray(ws.packages)) workspaces.push(...ws.packages);
    }

    for (const pattern of workspaces) {
      if (pattern.includes('*')) {
        // Simple glob: support "packages/*" style only (no deep glob)
        const basePath = pattern.replace(/\*.*$/, '');
        const absBase = join(this.targetDir, basePath);
        if (!existsSync(absBase)) continue;

        try {
          const dirs = readdirSync(absBase, { withFileTypes: true });
          for (const dir of dirs) {
            if (dir.isDirectory()) {
              this.loadDepsFromPkg(join(absBase, dir.name, 'package.json'));
            }
          }
        } catch {}
      } else {
        // Direct workspace path
        this.loadDepsFromPkg(join(this.targetDir, pattern, 'package.json'));
      }
    }
  }

  // ─── Private: lazy initialization (runs once) ─────────────────────────────
  private init(): void {
    if (this.initialized) return;
    this.initialized = true;

    // 1. Load declared dependencies (root + workspaces)
    this.loadDepsFromPkg(join(this.targetDir, 'package.json'));
    this.loadWorkspaceDeps();

    // 2. Walk source files and extract all imports
    const sourceFiles: string[] = [];
    this.walkDir(this.targetDir, sourceFiles);

    for (const filePath of sourceFiles) {
      try {
        const content = readFileSync(filePath, 'utf8');
        if (filePath.endsWith('.py')) {
          this.extractPyImports(content);
        } else {
          this.extractJsImports(content);
        }
        this._scannedFiles++;
      } catch {}
    }
  }

  // ─── Public API ───────────────────────────────────────────────────────────
  /**
   * Returns true if the package appears to be used in the source code.
   * Returns false if it's declared as a direct dep but never imported.
   *
   * @param pkgName - The npm package name (e.g. "lodash", "@org/pkg")
   */
  public isReachable(pkgName: string): boolean {
    if (!pkgName) return true;

    // Memoized result
    if (this.cache.has(pkgName)) return this.cache.get(pkgName)!;

    this.init();

    let result: boolean;

    if (this.usedImports.has(pkgName)) {
      // Directly imported → definitely reachable
      result = true;
    } else if (this.directDeps.has(pkgName)) {
      // Declared as a direct dep but never seen in source imports → unreachable
      result = false;
    } else {
      // Transitive dependency — we don't have full dep graph, so fail safe
      result = true;
    }

    this.cache.set(pkgName, result);
    return result;
  }

  /** Returns diagnostic stats about the analysis (useful for debugging). */
  public get stats(): { scannedFiles: number; usedImports: number; directDeps: number } {
    this.init();
    return {
      scannedFiles: this._scannedFiles,
      usedImports: this.usedImports.size,
      directDeps: this.directDeps.size,
    };
  }
}
