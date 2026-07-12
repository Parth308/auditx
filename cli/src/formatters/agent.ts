// formatters/agent.ts
import { createHash } from 'crypto';
import type { AuditReport, Finding, Severity, Config } from '../types.js';

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
    instruction?: string;
}

/**
 * Minimal token-cheap JSON for AI agent loops piping auditx stdout directly.
 * No prose, no color, no duplication — smallest payload that's still complete.
 */
export function formatAgent(report: AuditReport, config?: Config): string {
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

    if (config?.instruct && findings.length > 0) {
        out.instruction = generateAgentInstruction(out);
    }

    return JSON.stringify(out);
}

function generateAgentInstruction(report: AgentReport): string {
    const findingsList = report.findings.map((f, index) => {
        let text = `#### ${index + 1}. [${f.cat}] ${f.msg} (${f.sev.toUpperCase()})\n`;
        if (f.file) {
            text += `- **File**: \`${f.file}\`${f.line ? ` (Line ${f.line})` : ''}\n`;
        }
        if (f.rule) {
            text += `- **Rule**: \`${f.rule}\`\n`;
        }
        if (f.fix) {
            text += `- **Suggested Fix**: \`${f.fix}\`\n`;
        }
        return text;
    }).join('\n');

    return `You are an AI coding assistant (agent) running in this repository.
An automated security, performance, and code quality audit has been run.
Your task is to review and fix the issues listed below.

### Recommended Action Plan:
1. **Analyze Findings**: Review the list of findings below, focusing on the severity, file location, and description.
2. **Prioritized Fixing**: Begin by addressing the highest severity findings ('critical' and 'high') first.
3. **Refactoring Guidelines**:
   - Locate the target file and line using your tools.
   - Read the surrounding code context. Apply the fix without breaking existing functionality or repository style patterns.
   - For 'SECRETS': Never hardcode credentials. Use environment variables and add them to '.env' template/gitignore.
   - For 'DEPS': Upgrade the vulnerable package or dependency using the appropriate package manager commands.
   - For 'PATTERNS' / 'A11Y': Format the file or follow the suggested accessibility guidelines (e.g., adding image 'alt' tags).
4. **False Positives / Suppressions**: If a finding is a false positive, do not ignore it. Document it, and add a corresponding suppression signature to '.auditxignore' to prevent it from failing future scans.
5. **Verify Your Work**:
   - After applying fixes, execute \`npx auditx . --output agent --instruct\` to run the scan again and verify that the findings have been resolved.
   - Iterate until 'ok' is true.

### Findings to Fix:
${findingsList}

### Affected Files:
${report.files.map(f => `- ${f}`).join('\n')}`;
}

function fingerprint(f: Finding): string {
    const key = `${f.rule ?? f.category}:${f.file ?? ''}:${f.line ?? ''}:${f.title}`;
    return createHash('sha1').update(key).digest('hex').slice(0, 12);
}