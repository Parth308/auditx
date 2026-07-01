// formatters/agent.ts
import { createHash } from 'crypto';
import type { AuditReport, Finding, Severity } from '../types.js';

interface AgentFinding {
    id: string;
    fp: string;      // fingerprint, stable across runs
    sev: Severity;
    cat: string;
    rule?: string;
    file?: string;
    line?: number;
    msg: string;
    fix?: string;
}

interface AgentReport {
    ok: boolean;          // true = no critical/high, agent can stop
    exitCode: 0 | 1;
    counts: Record<Severity, number>;
    files: string[];      // unique files touched, agent iterates this
    findings: AgentFinding[];
}

/**
 * Minimal token-cheap JSON for AI agent loops piping auditx stdout directly.
 * No prose, no color, no duplication — smallest payload that's still complete.
 */
export function formatAgent(report: AuditReport): string {
    const urgentCount = report.summary.critical + report.summary.high;

    const findings: AgentFinding[] = report.findings.map((f) => ({
        id: f.id,
        fp: fingerprint(f),
        sev: f.severity,
        cat: f.category,
        rule: f.rule,
        file: f.file,
        line: f.line,
        msg: f.description ?? f.title,
        fix: f.fix,
    }));

    const files = [...new Set(findings.map((f) => f.file).filter(Boolean))] as string[];

    const out: AgentReport = {
        ok: urgentCount === 0,
        exitCode: urgentCount > 0 ? 1 : 0,
        counts: report.summary,
        files,
        findings,
    };

    return JSON.stringify(out);
}

function fingerprint(f: Finding): string {
    const key = `${f.rule ?? f.category}:${f.file ?? ''}:${f.line ?? ''}:${f.title}`;
    return createHash('sha1').update(key).digest('hex').slice(0, 12);
}