import { existsSync } from 'fs';
import { join } from 'path';
import type { StackInfo } from './types.js';

/**
 * Inspects the target directory and returns a StackInfo object
 * that tells runners which scanners are relevant to run.
 *
 * From plan.md:
 *   package.json present  → enable npm audit, eslint, knip
 *   requirements.txt      → enable pip-audit
 *   Pipfile / pyproject   → enable pip-audit
 *   Cargo.toml            → enable cargo audit
 *   Dockerfile            → enable trivy config (IaC)
 *   .git present          → enable gitleaks (full history scan)
 *   go.mod                → enable trivy go module scan
 */
export function detectStack(targetDir: string): StackInfo {
  const has = (file: string) => existsSync(join(targetDir, file));

  const hasGit = has('.git');

  return {
    hasNodeJs:
      has('package.json') ||
      has('package-lock.json') ||
      has('yarn.lock') ||
      has('pnpm-lock.yaml'),

    hasPython:
      has('requirements.txt') ||
      has('Pipfile') ||
      has('pyproject.toml') ||
      has('setup.py') ||
      has('setup.cfg'),

    hasRust: has('Cargo.toml'),

    hasGo: has('go.mod'),

    hasDocker: has('Dockerfile') || has('docker-compose.yml') || has('docker-compose.yaml'),

    hasGit,

    // Treat any .git dir as having history. Gitleaks will scan it.
    hasGitHistory: hasGit,

    hasTerraform:
      has('main.tf') ||
      has('terraform.tf') ||
      // Check a couple of common subdirectory patterns
      existsSync(join(targetDir, 'infra', 'main.tf')) ||
      existsSync(join(targetDir, 'terraform', 'main.tf')),
  };
}

/** Returns a human-readable list of detected stack labels for the report header. */
export function stackLabels(info: StackInfo): string[] {
  const labels: string[] = [];
  if (info.hasNodeJs) labels.push('Node.js');
  if (info.hasPython) labels.push('Python');
  if (info.hasRust) labels.push('Rust');
  if (info.hasGo) labels.push('Go');
  if (info.hasDocker) labels.push('Docker');
  if (info.hasTerraform) labels.push('Terraform');
  return labels;
}
