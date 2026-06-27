import { describe, it, expect } from 'vitest';
import { detectStack } from '../../src/detect.js';
import { join } from 'path';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';

function makeTempDir(...files: string[]): string {
  const dir = join(tmpdir(), `auditx-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  for (const file of files) {
    writeFileSync(join(dir, file), '');
  }
  return dir;
}

describe('detectStack()', () => {
  it('detects Node.js project via package.json', () => {
    const dir = makeTempDir('package.json');
    const stack = detectStack(dir);
    expect(stack.hasNodeJs).toBe(true);
    rmSync(dir, { recursive: true });
  });

  it('detects Python project via requirements.txt', () => {
    const dir = makeTempDir('requirements.txt');
    const stack = detectStack(dir);
    expect(stack.hasPython).toBe(true);
    rmSync(dir, { recursive: true });
  });

  it('detects Docker via Dockerfile', () => {
    const dir = makeTempDir('Dockerfile');
    const stack = detectStack(dir);
    expect(stack.hasDocker).toBe(true);
    rmSync(dir, { recursive: true });
  });

  it('detects Rust via Cargo.toml', () => {
    const dir = makeTempDir('Cargo.toml');
    const stack = detectStack(dir);
    expect(stack.hasRust).toBe(true);
    rmSync(dir, { recursive: true });
  });

  it('detects Go via go.mod', () => {
    const dir = makeTempDir('go.mod');
    const stack = detectStack(dir);
    expect(stack.hasGo).toBe(true);
    rmSync(dir, { recursive: true });
  });

  it('returns false for unrecognized project', () => {
    const dir = makeTempDir('some-random-file.txt');
    const stack = detectStack(dir);
    expect(stack.hasNodeJs).toBe(false);
    expect(stack.hasPython).toBe(false);
    expect(stack.hasDocker).toBe(false);
    rmSync(dir, { recursive: true });
  });
});
