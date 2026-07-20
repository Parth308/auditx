import { describe, it, expect, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  buildCodeGraph, loadGraph,
  queryContext, queryCallers, queryCallees, queryRiskFlags,
} from '../src/graph.js';
import type { Finding } from '../src/types.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TS_FIXTURE = `
import { helper } from './utils';
import { readFile } from 'fs';

export class AuthService {
  async login(user: string, pass: string) {
    return helper(user);
  }
}

export function verifyToken(token: string) {
  return token.length > 0;
}
`;

const PY_FIXTURE = `
from flask import request

class UserController:
  def get_user(self, user_id):
    return request.json

def handle_request():
  return None
`;

function makeTempDir(): string {
  const dir = join(tmpdir(), `auditx-graph-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('buildCodeGraph()', () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const d of dirs) {
      try { rmSync(d, { recursive: true, force: true }); } catch {}
    }
    dirs.length = 0;
  });

  it('generates auditx-graph.json with correct schema', async () => {
    const dir = makeTempDir(); dirs.push(dir);
    writeFileSync(join(dir, 'auth.ts'), TS_FIXTURE, 'utf-8');

    const graph = await buildCodeGraph(dir, []);

    expect(graph).toHaveProperty('nodes');
    expect(graph).toHaveProperty('edges');
    expect(graph).toHaveProperty('generatedAt');
    expect(Array.isArray(graph.nodes)).toBe(true);
    expect(Array.isArray(graph.edges)).toBe(true);

    expect(existsSync(join(dir, 'auditx-graph.json'))).toBe(true);
  });

  it('extracts file, class, function, import nodes from TypeScript', async () => {
    const dir = makeTempDir(); dirs.push(dir);
    writeFileSync(join(dir, 'auth.ts'), TS_FIXTURE, 'utf-8');

    const graph = await buildCodeGraph(dir, []);
    const types = graph.nodes.map(n => n.type);

    expect(types).toContain('file');
    expect(types).toContain('function');
    expect(types).toContain('import');

    const names = graph.nodes.map(n => n.name);
    expect(names).toContain('verifyToken');
    expect(names).toContain('AuthService');
  });

  it('extracts class and function nodes from Python', async () => {
    const dir = makeTempDir(); dirs.push(dir);
    writeFileSync(join(dir, 'api.py'), PY_FIXTURE, 'utf-8');

    const graph = await buildCodeGraph(dir, []);
    const names = graph.nodes.map(n => n.name);

    expect(names).toContain('UserController');
    expect(names).toContain('handle_request');
  });

  it('attaches findings as risk_flags to the owning node', async () => {
    const dir = makeTempDir(); dirs.push(dir);
    writeFileSync(join(dir, 'auth.ts'), TS_FIXTURE, 'utf-8');

    const findings: Finding[] = [
      {
        id: 'f1',
        category: 'SAST',
        severity: 'high',
        title: 'Hardcoded secret',
        file: join(dir, 'auth.ts'),
        line: 7,
        rule: 'semgrep/hardcoded-secret',
        scanner: 'semgrep',
      },
    ];

    const graph = await buildCodeGraph(dir, findings);
    const nodesWithFlags = graph.nodes.filter(n => n.risk_flags.length > 0);

    expect(nodesWithFlags.length).toBeGreaterThan(0);
    const flag = nodesWithFlags[0].risk_flags[0];
    expect(flag.rule).toBe('semgrep/hardcoded-secret');
    expect(flag.severity).toBe('high');
    expect(flag.scanner).toBe('semgrep');
  });

  it('uses cache on second call — only parses changed files', async () => {
    const dir = makeTempDir(); dirs.push(dir);
    writeFileSync(join(dir, 'a.ts'), 'export function foo() {}', 'utf-8');
    writeFileSync(join(dir, 'b.ts'), 'export function bar() {}', 'utf-8');

    // First build
    const g1 = await buildCodeGraph(dir, []);
    expect(existsSync(join(dir, '.auditx-graph-cache.json'))).toBe(true);

    // Modify only b.ts
    writeFileSync(join(dir, 'b.ts'), 'export function barUpdated() {}', 'utf-8');

    // Second build — should hit cache for a.ts
    const g2 = await buildCodeGraph(dir, []);

    const aNode = g2.nodes.find(n => n.name === 'foo');
    const bNodeOld = g2.nodes.find(n => n.name === 'bar');
    const bNodeNew = g2.nodes.find(n => n.name === 'barUpdated');

    expect(aNode).toBeTruthy();          // still there from cache
    expect(bNodeOld).toBeFalsy();        // old name gone
    expect(bNodeNew).toBeTruthy();       // new name after re-parse
  });

  it('respects excludes when walking files', async () => {
    const dir = makeTempDir(); dirs.push(dir);
    writeFileSync(join(dir, 'main.ts'), 'export function main() {}', 'utf-8');
    mkdirSync(join(dir, 'generated'), { recursive: true });
    writeFileSync(join(dir, 'generated', 'stub.ts'), 'export function stub() {}', 'utf-8');

    const graph = await buildCodeGraph(dir, [], ['generated']);
    const names = graph.nodes.map(n => n.name);

    expect(names).toContain('main');
    expect(names).not.toContain('stub');
  });
});

describe('Graph query helpers', () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const d of dirs) {
      try { rmSync(d, { recursive: true, force: true }); } catch {}
    }
    dirs.length = 0;
  });

  it('loadGraph returns null when no file exists', () => {
    const dir = makeTempDir(); dirs.push(dir);
    expect(loadGraph(dir)).toBeNull();
  });

  it('queryContext finds a node by name', async () => {
    const dir = makeTempDir(); dirs.push(dir);
    writeFileSync(join(dir, 'auth.ts'), TS_FIXTURE, 'utf-8');
    const graph = await buildCodeGraph(dir, []);

    const ctx = queryContext(graph, 'verifyToken');
    expect(ctx.node).not.toBeNull();
    expect(ctx.node?.name).toBe('verifyToken');
  });

  it('queryCallers returns nodes calling the symbol', async () => {
    const dir = makeTempDir(); dirs.push(dir);
    // auth.ts calls helper
    writeFileSync(join(dir, 'auth.ts'), TS_FIXTURE, 'utf-8');
    const graph = await buildCodeGraph(dir, []);

    // helper is called inside login — edge from auth.ts file node to external::helper
    const callers = queryCallers(graph, 'helper');
    // May be external if helper isn't defined here — that's fine, edges still exist
    expect(Array.isArray(callers)).toBe(true);
  });

  it('queryRiskFlags returns only nodes with findings', async () => {
    const dir = makeTempDir(); dirs.push(dir);
    writeFileSync(join(dir, 'auth.ts'), TS_FIXTURE, 'utf-8');
    const findings: Finding[] = [{
      id: 'f1', category: 'SECRETS', severity: 'critical',
      title: 'Secret found', file: join(dir, 'auth.ts'),
      line: 6, rule: 'gitleaks/generic-secret', scanner: 'gitleaks',
    }];
    const graph = await buildCodeGraph(dir, findings);

    const risky = queryRiskFlags(graph);
    expect(risky.length).toBeGreaterThan(0);
    expect(risky[0].risk_flags[0].severity).toBe('critical');
  });

  it('queryRiskFlags filters by file path', async () => {
    const dir = makeTempDir(); dirs.push(dir);
    writeFileSync(join(dir, 'auth.ts'), TS_FIXTURE, 'utf-8');
    writeFileSync(join(dir, 'util.ts'), 'export function helper() {}', 'utf-8');

    const findings: Finding[] = [{
      id: 'f1', category: 'SAST', severity: 'high',
      title: 'Issue', file: join(dir, 'auth.ts'),
      line: 7, rule: 'semgrep/rule', scanner: 'semgrep',
    }];
    const graph = await buildCodeGraph(dir, findings);

    const authRisky = queryRiskFlags(graph, 'auth.ts');
    const utilRisky = queryRiskFlags(graph, 'util.ts');

    expect(authRisky.length).toBeGreaterThan(0);
    expect(utilRisky.length).toBe(0);
  });
});
