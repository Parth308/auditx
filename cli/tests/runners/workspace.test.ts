import { describe, it, expect } from 'vitest';
import { detectWorkspaces, isMonorepo } from '../../src/workspace.js';
import { detectStack } from '../../src/detect.js';
import { join } from 'path';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';

function makeTempWorkspace(): string {
  const dir = join(tmpdir(), `auditx-ws-test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe('detectWorkspaces()', () => {
  it('returns root-only workspace for single package repo', () => {
    const dir = makeTempWorkspace();
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'single-app' }));
    
    const stack = detectStack(dir);
    const workspaces = detectWorkspaces(dir, stack);
    
    expect(workspaces).toHaveLength(1);
    expect(workspaces[0].isRoot).toBe(true);
    expect(workspaces[0].name).toBe('root');
    expect(isMonorepo(workspaces)).toBe(false);

    rmSync(dir, { recursive: true, force: true });
  });

  it('detects monorepo subfolders via package.json markers', () => {
    const dir = makeTempWorkspace();
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'root-app' }));

    const frontendDir = join(dir, 'frontend');
    mkdirSync(frontendDir, { recursive: true });
    writeFileSync(join(frontendDir, 'package.json'), JSON.stringify({ name: 'frontend' }));

    const backendDir = join(dir, 'backend');
    mkdirSync(backendDir, { recursive: true });
    writeFileSync(join(backendDir, 'requirements.txt'), 'django>=4.0');

    const stack = detectStack(dir);
    const workspaces = detectWorkspaces(dir, stack);

    expect(isMonorepo(workspaces)).toBe(true);
    expect(workspaces).toHaveLength(3); // root + frontend + backend

    const names = workspaces.map(w => w.name);
    expect(names).toContain('root');
    expect(names).toContain('frontend');
    expect(names).toContain('backend');

    rmSync(dir, { recursive: true, force: true });
  });

  it('detects workspaces from package.json "workspaces" array', () => {
    const dir = makeTempWorkspace();
    writeFileSync(join(dir, 'package.json'), JSON.stringify({
      name: 'root-monorepo',
      workspaces: ['packages/*']
    }));

    const pkgA = join(dir, 'packages', 'pkg-a');
    mkdirSync(pkgA, { recursive: true });
    writeFileSync(join(pkgA, 'package.json'), JSON.stringify({ name: 'pkg-a' }));

    const stack = detectStack(dir);
    const workspaces = detectWorkspaces(dir, stack);

    expect(isMonorepo(workspaces)).toBe(true);
    const names = workspaces.map(w => w.name);
    expect(names).toContain('packages/pkg-a');

    rmSync(dir, { recursive: true, force: true });
  });
});
