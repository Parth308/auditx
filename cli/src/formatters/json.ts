import { createHash } from 'crypto';
import type { AuditReport, Finding, Severity } from '../types.js';

const SCHEMA_VERSION = '1.0.0';

interface EnrichedJsonReport {
  schemaVersion: string;
  generatedBy: string;
  meta: AuditReport['meta'];
  summary: AuditReport['summary'] & {
    totalFindings: number;
    fixableCount: number;
    filesAffected: number;
    urgentCount: number; // critical + high, for quick CI gate check
  };
  exitCode: 0 | 1; // 1 if critical/high present — agent can branch on this directly
  findings: (Finding & { fingerprint: string; fixable: boolean })[];
  findingsByFile: Record<string, string[]>; // file -> finding ids, for agent "go fix this file" loops
  agentNote: string; // plain instruction for LLM agents consuming this blind
}

/**
 * Serializes the AuditReport to JSON.
 * Enriched for two consumers:
 *  1. Humans piping to jq / dashboards
 *  2. AI agents running auditx in a loop to self-fix code
 */
export function formatJson(report: AuditReport): string {
  const sortedFindings = [...report.findings].sort((a, b) => {
    const sevOrder: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    if (sevOrder[a.severity] !== sevOrder[b.severity]) return sevOrder[a.severity] - sevOrder[b.severity];
    if ((a.file ?? '') !== (b.file ?? '')) return (a.file ?? '').localeCompare(b.file ?? '');
    return (a.line ?? 0) - (b.line ?? 0);
  });

  const enrichedFindings = sortedFindings.map((f) => ({
    ...f,
    fingerprint: fingerprintFinding(f), // stable across runs even if scan order changes — agents/CI can dedupe/diff
    fixable: Boolean(f.fix),
  }));

  const findingsByFile: Record<string, string[]> = {};
  for (const f of enrichedFindings) {
    if (!f.file) continue;
    (findingsByFile[f.file] ??= []).push(f.id);
  }

  const urgentCount = report.summary.critical + report.summary.high;
  const filesAffected = Object.keys(findingsByFile).length;
  const fixableCount = enrichedFindings.filter((f) => f.fixable).length;

  const enriched: EnrichedJsonReport = {
    schemaVersion: SCHEMA_VERSION,
    generatedBy: 'auditx',
    meta: report.meta,
    summary: {
      ...report.summary,
      totalFindings: enrichedFindings.length,
      fixableCount,
      filesAffected,
      urgentCount,
    },
    exitCode: urgentCount > 0 ? 1 : 0,
    findings: enrichedFindings,
    findingsByFile,
    agentNote:
      urgentCount > 0
        ? `${urgentCount} critical/high finding(s) require action. Iterate findingsByFile, fix each file, re-run auditx to verify. Findings with fixable:true have a suggested fix in the "fix" field.`
        : 'No critical/high findings. Safe to proceed.',
  };

  return JSON.stringify(enriched, null, 2);
}

// Stable id independent of scan-order/uuid — same bug across two runs gets same fingerprint
function fingerprintFinding(f: Finding): string {
  const key = `${f.rule ?? f.category}:${f.file ?? ''}:${f.line ?? ''}:${f.title}`;
  return createHash('sha1').update(key).digest('hex').slice(0, 12);
}