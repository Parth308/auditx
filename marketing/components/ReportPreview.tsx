'use client';
import { useState } from 'react';
import ScrollReveal from './ScrollReveal';
import CopyButton from './CopyButton';

const HR = '1px solid rgba(15,0,0,0.12)';
const FONT = 'inherit';

const SEV_BAR: Record<string, string> = {
  critical: '#ff3b30',
  high:     '#ff9f0a',
  medium:   '#007aff',
};

const FINDINGS = [
  {
    sev: 'critical',
    title: '### [SECRETS] Hardcoded API key detected',
    file: 'src/config/db.ts:14',
    rule: 'gitleaks/generic-api-key',
    fix: 'Move to .env · Rotate the key · Add .env to .gitignore',
  },
  {
    sev: 'high',
    title: '### [TYPE_SAFETY] Type error in async handler',
    file: 'src/api/routes.ts:52',
    rule: 'tsc/ts2304',
    fix: 'Add return type annotation to async function',
  },
  {
    sev: 'medium',
    title: '### [AI_CODE] Floating promise — ai-floating-promise',
    file: 'src/api/client.ts:82',
    rule: 'ai-floating-promise',
    fix: 'await the call or attach .catch()',
  },
  {
    sev: 'medium',
    title: '### [AI_CODE] TypeScript any cast — ai-ts-any-cast',
    file: 'src/utils/parser.ts:31',
    rule: 'ai-ts-any-cast',
    fix: 'Type the value properly instead of casting to any',
  },
];

const MD_CONTENT = `# 🛡️ auditx Security Report

**Target**: \`/projects/my-app\`
**Scanned**: 2026-07-02 00:01 IST · **Duration**: 9.4s
**Stack**: Node.js · TypeScript · Docker
**Scanners**: semgrep · trivy · gitleaks · knip · tsc · jscpd · lizard · aipatterns

---

## Summary

| Category    | 🔴 Critical | 🟠 High | 🟡 Medium | 🔵 Low |
|-------------|-------------|---------|-----------|--------|
| SECRETS     |      1      |    —    |     —     |    —   |
| DEPS        |      —      |    3    |     5     |    2   |
| AI_CODE     |      —      |    —    |     3     |    4   |
| TYPE_SAFETY |      —      |    1    |     2     |    —   |
| **Total**   |    **1**    |  **4**  |   **10**  |  **6** |

> ⚠️ 5 critical/high findings require immediate attention.`;

const JSON_CONTENT = `{
  "meta": {
    "target": "/projects/my-app",
    "scannedAt": "2026-07-02T00:01:00Z",
    "durationMs": 9400,
    "stack": ["nodejs", "typescript", "docker"]
  },
  "summary": {
    "critical": 1,
    "high": 4,
    "medium": 10,
    "low": 6
  },
  "findings": [
    {
      "id": "gitleaks-001",
      "fp": "a3f91bc4d2e1",
      "category": "SECRETS",
      "severity": "critical",
      "title": "Hardcoded API key in source file",
      "file": "src/config/db.ts",
      "line": 14,
      "rule": "gitleaks/generic-api-key",
      "scanner": "gitleaks",
      "fix": "Move to .env · Rotate the key"
    },
    {
      "id": "aipatterns-003",
      "fp": "b8c22de94f3a",
      "category": "AI_CODE",
      "severity": "medium",
      "title": "Floating promise — no await or .catch",
      "file": "src/api/client.ts",
      "line": 82,
      "rule": "ai-floating-promise",
      "scanner": "aipatterns",
      "fix": "await the call or attach .catch()"
    }
  ]
}`;

const TERMINAL_LINES = [
  { text: '  ┌──────────────┬──────────┬────────┬────────┬──────┐', color: '#646262' },
  { text: '  │ Category     │ Critical │  High  │ Medium │  Low │', color: '#424245' },
  { text: '  ├──────────────┼──────────┼────────┼────────┼──────┤', color: '#646262' },
  { text: '  │ Secrets      │    1     │   —    │   —    │   —  │', color: '#ff3b30' },
  { text: '  │ Deps         │    —     │   3    │   5    │   2  │', color: '#ff9f0a' },
  { text: '  │ AI_Code      │    —     │   —    │   3    │   4  │', color: '#007aff' },
  { text: '  │ Type Safety  │    —     │   1    │   2    │   —  │', color: '#ff9f0a' },
  { text: '  └──────────────┴──────────┴────────┴────────┴──────┘', color: '#646262' },
  { text: '', color: '' },
  { text: '  🔴 [SECRETS] Hardcoded API key — src/config/db.ts:14', color: '#ff3b30' },
  { text: '     Rule: gitleaks/generic-api-key', color: '#9a9898' },
  { text: '     Fix:  Move to .env · Rotate the key', color: '#30d158' },
  { text: '', color: '' },
  { text: '  🟡 [AI_CODE] ai-floating-promise — src/api/client.ts:82', color: '#007aff' },
  { text: '     Rule: ai-floating-promise', color: '#9a9898' },
  { text: '     Fix:  await the call or attach .catch()', color: '#30d158' },
  { text: '', color: '' },
  { text: '  ⚠  1 critical · 4 high findings need immediate attention.', color: '#ff9f0a' },
  { text: '  ✅ Report written → audit-report.md', color: '#30d158' },
];

const TABS = ['audit-report.md', 'audit-report.json', 'terminal'] as const;
type Tab = typeof TABS[number];

const COPY_CONTENT: Record<Tab, string> = {
  'audit-report.md':   MD_CONTENT,
  'audit-report.json': JSON_CONTENT,
  'terminal':          TERMINAL_LINES.map((l) => l.text).join('\n'),
};

export default function ReportPreview() {
  const [active, setActive] = useState<Tab>('audit-report.md');

  return (
    <section id="report" className="page-section">
      <ScrollReveal>
        <div style={{ borderBottom: HR, paddingBottom: 12, marginBottom: 32 }}>
          <div style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: '#201d1d' }}>
            [+] Live report preview
          </div>
          <div style={{ fontFamily: FONT, fontSize: 14, marginTop: 6, color: '#646262' }}>
            Real findings, real format. Click the tabs.
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={80}>
        <div style={{ border: HR }}>
          {/* ── Tab strip ── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#f8f7f7',
            borderBottom: HR,
            overflowX: 'auto',
          }}>
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActive(tab)}
                style={{
                  fontFamily: FONT,
                  fontSize: 12,
                  padding: '9px 16px',
                  color: active === tab ? '#201d1d' : '#646262',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRight: HR,
                  borderBottom: active === tab ? '2px solid #201d1d' : '2px solid transparent',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s ease',
                  fontWeight: active === tab ? 500 : 400,
                }}
              >
                {tab}
              </button>
            ))}
            <div style={{ marginLeft: 'auto', paddingRight: 10, flexShrink: 0 }}>
              <CopyButton code={COPY_CONTENT[active]} />
            </div>
          </div>

          {/* ── Tab content ── */}
          <div style={{ backgroundColor: '#fdfcfc' }}>

            {/* Markdown tab */}
            {active === 'audit-report.md' && (
              <div style={{ padding: '24px 28px' }}>
                <pre style={{
                  fontFamily: FONT, fontSize: 13, lineHeight: 1.9,
                  color: '#201d1d', whiteSpace: 'pre-wrap', marginBottom: 24,
                }}>
                  {MD_CONTENT}
                </pre>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {FINDINGS.map((f) => (
                    <div
                      key={f.title}
                      style={{
                        paddingLeft: 12, paddingTop: 10, paddingBottom: 10,
                        borderLeft: `3px solid ${SEV_BAR[f.sev]}`,
                        backgroundColor: '#f8f7f7',
                      }}
                    >
                      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 13, color: '#201d1d', marginBottom: 4 }}>
                        {f.title}
                      </div>
                      <div style={{ fontFamily: FONT, fontSize: 12, color: '#646262' }}>
                        <span style={{ color: '#424245' }}>{f.file}</span>
                        {' · '}
                        <code>{f.rule}</code>
                      </div>
                      <div style={{ fontFamily: FONT, fontSize: 12, color: '#646262', marginTop: 2 }}>
                        Fix: <span style={{ color: '#201d1d' }}>{f.fix}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* JSON tab */}
            {active === 'audit-report.json' && (
              <div className="scroll-x" style={{ padding: '24px 28px' }}>
                <pre style={{
                  fontFamily: FONT, fontSize: 12, lineHeight: 1.85,
                  color: '#201d1d', whiteSpace: 'pre', margin: 0,
                }}>
                  {JSON_CONTENT
                    .replace(/"([^"]+)":/g, '<k>"$1":</k>')
                    .split('\n')
                    .map((line, i) => (
                      <div key={i} dangerouslySetInnerHTML={{ __html:
                        line
                          .replace(/"([^"]+)":/g, `<span style="color:#007aff">"$1"</span>:`)
                          .replace(/: "([^"]+)"/g, `: <span style="color:#30d158">"$1"</span>`)
                          .replace(/: (\d+)/g, `: <span style="color:#ff9f0a">$1</span>`)
                      }} />
                    ))
                  }
                </pre>
              </div>
            )}

            {/* Terminal tab */}
            {active === 'terminal' && (
              <div className="scroll-x" style={{ backgroundColor: '#201d1d', padding: '24px 28px', overflowX: 'auto' }}>
                <div style={{ fontFamily: FONT, fontSize: 13, lineHeight: 1.85, minWidth: 'max-content' }}>
                  {TERMINAL_LINES.map((line, i) => (
                    <div key={i} style={{ color: line.color || 'transparent', whiteSpace: 'pre', minHeight: '1.85em' }}>
                      {line.text || '\u00A0'}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
