import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import type { StackInfo } from './types.js';

const MAX_DEPTH = 4;
const IGNORE_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'vendor', '.cache', 'coverage']);

const TARGET_FILES = new Set([
  'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  'bun.lockb', 'bun.lock',
  'requirements.txt', 'Pipfile', 'pyproject.toml', 'setup.py', 'setup.cfg', 'poetry.lock',
  'Cargo.toml', 'go.mod', 'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
  'main.tf', 'terraform.tf', 'tsconfig.json',
  'schema.sql', 'schema.prisma', 'drizzle.config.ts'
]);

interface WorkspaceScan {
  foundNames: Set<string>;
  packageJsons: string[];
  requirementsTxts: string[];
}

function scanWorkspace(dir: string, maxDepth: number, currentDepth = 0, result: WorkspaceScan = { foundNames: new Set(), packageJsons: [], requirementsTxts: [] }): WorkspaceScan {
  if (currentDepth > maxDepth) return result;

  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.has(entry.name)) {
          scanWorkspace(join(dir, entry.name), maxDepth, currentDepth + 1, result);
        }
      } else if (entry.isFile()) {
        const name = entry.name;
        // Optimization: For the root dir (depth 0), we record special directory names like 'infra', 'prisma', 'migrations'
        // But for files, we check if they are in TARGET_FILES
        if (TARGET_FILES.has(name) || name.endsWith('.tf') || name.endsWith('.sql')) {
          result.foundNames.add(name);
          if (name === 'package.json') result.packageJsons.push(join(dir, name));
          if (name === 'requirements.txt') result.requirementsTxts.push(join(dir, name));
        }
      }
    }
  } catch (err) {
    // Ignore permissions errors or missing dirs
  }

  // Also check some common root directories for hints (e.g. prisma/, db/, migrations/, infra/, terraform/)
  if (currentDepth === 0) {
    const rootDirs = ['prisma', 'db', 'migrations', 'infra', 'terraform', '.git'];
    for (const rd of rootDirs) {
      if (existsSync(join(dir, rd))) {
        result.foundNames.add(rd);
      }
    }
  }

  return result;
}

export function detectStack(targetDir: string): StackInfo {
  const scan = scanWorkspace(targetDir, MAX_DEPTH);
  const allDeps = extractNodeDeps(scan.packageJsons);
  const allReqs = extractPythonReqs(scan.requirementsTxts);
  const hasGit = scan.foundNames.has('.git');
  const hasGitHistory = checkGitHistory(hasGit, targetDir);

  return buildStackInfo(scan.foundNames, allDeps, allReqs, hasGit, hasGitHistory);
}

function buildStackInfo(foundNames: Set<string>, deps: Set<string>, reqs: string, hasGit: boolean, hasGitHistory: boolean): StackInfo {
  const has = (name: string) => foundNames.has(name);
  const hasExt = (ext: string) => Array.from(foundNames).some(n => n.endsWith(ext));

  return {
    hasNodeJs: has('package.json') || has('package-lock.json') || has('yarn.lock') || has('pnpm-lock.yaml') || has('bun.lockb') || has('bun.lock'),
    hasPython: has('requirements.txt') || has('Pipfile') || has('pyproject.toml') || has('setup.py') || has('setup.cfg') || has('poetry.lock'),
    hasRust: has('Cargo.toml'),
    hasGo: has('go.mod'),
    hasDocker: has('Dockerfile') || has('docker-compose.yml') || has('docker-compose.yaml'),
    hasGit,
    hasGitHistory,
    hasTerraform: has('main.tf') || has('terraform.tf') || has('infra') || has('terraform') || hasExt('.tf'),
    hasTypeScript: has('tsconfig.json'),
    hasReact: deps.has('react'),
    hasNextJs: deps.has('next'),
    hasNestJs: deps.has('@nestjs/core'),
    hasExpress: deps.has('express'),
    hasDjango: reqs.includes('django'),
    hasSql: has('schema.sql') || has('schema.prisma') || has('drizzle.config.ts') || has('prisma') || has('migrations') || has('db') || hasExt('.sql'),
  };
}

export function stackLabels(info: StackInfo): string[] {
  const labels: string[] = [];
  if (info.hasNodeJs) labels.push('Node.js');
  if (info.hasTypeScript) labels.push('TypeScript');
  if (info.hasReact) labels.push('React');
  if (info.hasNextJs) labels.push('Next.js');
  if (info.hasNestJs) labels.push('NestJS');
  if (info.hasExpress) labels.push('Express');
  if (info.hasPython) labels.push('Python');
  if (info.hasDjango) labels.push('Django');
  if (info.hasRust) labels.push('Rust');
  if (info.hasGo) labels.push('Go');
  if (info.hasSql) labels.push('SQL');
  if (info.hasDocker) labels.push('Docker');
  if (info.hasTerraform) labels.push('Terraform');
  return labels;
}

function extractNodeDeps(packageJsons: string[]): Set<string> {
  const allDeps = new Set<string>();
  for (const pkgPath of packageJsons) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      if (pkg.dependencies) Object.keys(pkg.dependencies).forEach(d => allDeps.add(d));
      if (pkg.devDependencies) Object.keys(pkg.devDependencies).forEach(d => allDeps.add(d));
    } catch {}
  }
  return allDeps;
}

function extractPythonReqs(requirementsTxts: string[]): string {
  let allReqs = '';
  for (const reqPath of requirementsTxts) {
    try {
      allReqs += readFileSync(reqPath, 'utf-8').toLowerCase() + '\n';
    } catch {}
  }
  return allReqs;
}

function checkGitHistory(hasGit: boolean, targetDir: string): boolean {
  if (!hasGit) return false;
  try {
    const out = execSync('git log --oneline -1', { cwd: targetDir, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    return out.trim().length > 0;
  } catch {
    return false;
  }
}

