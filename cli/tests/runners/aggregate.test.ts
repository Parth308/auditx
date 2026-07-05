import { describe, it, expect } from 'vitest';
import { aggregate, filterBySeverity, buildSummary } from '../../src/aggregate.js';
import type { Finding, ScanResult } from '../../src/types.js';

const makeFinding = (overrides: Partial<Finding>): Finding => ({
  id: '',
  category: 'SAST',
  severity: 'medium',
  title: 'Test finding',
  scanner: 'test',
  ...overrides,
});

const makeResult = (findings: Finding[]): ScanResult => ({
  scanner: 'test',
  ok: true,
  findings,
  durationMs: 0,
});

describe('aggregate()', () => {
  it('flattens findings from multiple results', () => {
    const r1 = makeResult([makeFinding({ title: 'A' }), makeFinding({ title: 'B' })]);
    const r2 = makeResult([makeFinding({ title: 'C' })]);
    const result = aggregate([r1, r2]);
    expect(result).toHaveLength(3);
  });

  it('deduplicates findings with same rule + file + line', () => {
    const dup = makeFinding({ rule: 'rule-1', file: 'foo.ts', line: 10, title: 'Dup' });
    const r1 = makeResult([dup, dup]);
    const result = aggregate([r1]);
    expect(result).toHaveLength(1);
  });

  it('sorts by severity (critical first)', () => {
    const findings = [
      makeFinding({ severity: 'low', title: 'L' }),
      makeFinding({ severity: 'critical', title: 'C' }),
      makeFinding({ severity: 'medium', title: 'M' }),
    ];
    const result = aggregate([makeResult(findings)]);
    expect(result[0].severity).toBe('critical');
    expect(result[2].severity).toBe('low');
  });

  it('assigns deterministic IDs', () => {
    const findings = [makeFinding({ title: 'A' }), makeFinding({ title: 'B' })];
    const result = aggregate([makeResult(findings)]);
    expect(result[0].id).toMatch(/^auditx-[a-f0-9]{8}$/);
    expect(result[1].id).toMatch(/^auditx-[a-f0-9]{8}$/);
    expect(result[0].id).not.toBe(result[1].id);
  });

  it('skips results where ok = false', () => {
    const bad: ScanResult = {
      scanner: 'bad',
      ok: false,
      findings: [makeFinding({ title: 'Should be ignored' })],
      durationMs: 0,
    };
    const result = aggregate([bad]);
    expect(result).toHaveLength(0);
  });
});

describe('filterBySeverity()', () => {
  it('filters to high and above when minSeverity = high', () => {
    const findings = [
      makeFinding({ severity: 'critical' }),
      makeFinding({ severity: 'high' }),
      makeFinding({ severity: 'medium' }),
      makeFinding({ severity: 'low' }),
    ];
    const result = filterBySeverity(findings, 'high');
    expect(result).toHaveLength(2);
    expect(result.every((f) => f.severity === 'critical' || f.severity === 'high')).toBe(true);
  });
});

describe('buildSummary()', () => {
  it('counts findings by severity', () => {
    const findings = [
      makeFinding({ severity: 'critical' }),
      makeFinding({ severity: 'critical' }),
      makeFinding({ severity: 'high' }),
    ];
    const summary = buildSummary(findings);
    expect(summary.critical).toBe(2);
    expect(summary.high).toBe(1);
    expect(summary.medium).toBe(0);
  });
});
