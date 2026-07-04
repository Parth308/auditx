'use client';
import { useState } from 'react';
import ScrollReveal from './ScrollReveal';
import CopyButton from './CopyButton';

const SEV_BAR: Record<string, string> = {
  critical: 'var(--color-danger)',
  high:     'var(--color-warn)',
  medium:   'var(--color-accent)',
};

const FINDINGS = [
  {
    sev: 'critical',
    title: '[SECRETS] Hardcoded API key detected',
    file: 'src/config/db.ts:14',
    rule: 'gitleaks/generic-api-key',
    fix: 'Move to .env · Rotate the key · Add .env to .gitignore',
  },
  {
    sev: 'high',
    title: '[TYPE_SAFETY] Type error in async handler',
    file: 'src/api/routes.ts:52',
    rule: 'tsc/ts2304',
    fix: 'Add return type annotation to async function',
  },
  {
    sev: 'medium',
    title: '[AI_CODE] Floating promise — ai-floating-promise',
    file: 'src/api/client.ts:82',
    rule: 'ai-floating-promise',
    fix: 'await the call or attach .catch()',
  },
  {
    sev: 'medium',
    title: '[AI_CODE] TypeScript any cast — ai-ts-any-cast',
    file: 'src/utils/parser.ts:31',
    rule: 'ai-ts-any-cast',
    fix: 'Type the value properly instead of casting to any',
  },
];

const MD_CONTENT = `# auditx Security Report

**Target**: \`/projects/my-app\`
**Scanned**: 2026-07-04 · **Duration**: 9.4s
**Stack**: Node.js · TypeScript · Docker
**Scanners**: semgrep · trivy · gitleaks · tsc · aipatterns

---

## Summary

| Category    | Critical | High | Medium | Low |
|-------------|----------|------|--------|-----|
| SECRETS     |    1     |  —   |   —    |  —  |
| DEPS        |    —     |  3   |   5    |  2  |
| AI_CODE     |    —     |  —   |   3    |  4  |
| TYPE_SAFETY |    —     |  1   |   2    |  —  |
| **Total**   |  **1**   |**4** | **10** |**6**|

> 5 critical/high findings require immediate attention.`;

const JSON_CONTENT = `{
  "meta": {
    "target": "/projects/my-app",
    "scannedAt": "2026-07-04T00:01:00Z",
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
      "fix": "Move to .env · Rotate the key"
    }
  ]
}`;

const TERMINAL_LINES = [
  { text: '  ┌──────────────┬──────────┬────────┬────────┬──────┐', color: 'var(--color-ash)' },
  { text: '  │ Category     │ Critical │  High  │ Medium │  Low │', color: 'var(--color-mute)' },
  { text: '  ├──────────────┼──────────┼────────┼────────┼──────┤', color: 'var(--color-ash)' },
  { text: '  │ Secrets      │    1     │   —    │   —    │   —  │', color: 'var(--color-danger)' },
  { text: '  │ Deps         │    —     │   3    │   5    │   2  │', color: 'var(--color-warn)' },
  { text: '  │ AI_Code      │    —     │   —    │   3    │   4  │', color: 'var(--color-accent)' },
  { text: '  │ Type Safety  │    —     │   1    │   2    │   —  │', color: 'var(--color-warn)' },
  { text: '  └──────────────┴──────────┴────────┴────────┴──────┘', color: 'var(--color-ash)' },
  { text: '', color: '' },
  { text: '  [CRITICAL] Hardcoded API key — src/config/db.ts:14', color: 'var(--color-danger)' },
  { text: '             Rule: gitleaks/generic-api-key', color: 'var(--color-mute)' },
  { text: '             Fix:  Move to .env · Rotate the key', color: 'var(--color-ok)' },
  { text: '', color: '' },
  { text: '  [MEDIUM]   ai-floating-promise — src/api/client.ts:82', color: 'var(--color-accent)' },
  { text: '             Rule: ai-floating-promise', color: 'var(--color-mute)' },
  { text: '             Fix:  await the call or attach .catch()', color: 'var(--color-ok)' },
  { text: '', color: '' },
  { text: '  1 critical · 4 high findings need immediate attention.', color: 'var(--color-warn)' },
  { text: '  Report written to: audit-report.md', color: 'var(--color-ok)' },
];

const TABS = ['audit-report.md', 'audit-report.json', 'terminal'] as const;
type Tab = typeof TABS[number];

const COPY_CONTENT: Record<Tab, string> = {
  'audit-report.md':   MD_CONTENT,
  'audit-report.json': JSON_CONTENT,
  'terminal':          TERMINAL_LINES.map(l => l.text).join('\n'),
};

export default function ReportPreview() {
  const [active, setActive] = useState<Tab>('audit-report.md');

  return (
    <section id="report" className="page-section">
      <ScrollReveal>
        <div style={{ marginBottom: 36 }}>
          <h2 style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'clamp(24px, 3vw, 36px)',
            fontWeight: 800,
            letterSpacing: '-0.8px',
            color: 'var(--color-ink)',
            lineHeight: 1.2,
          }}>
            Real findings, real format. Click the tabs.
          </h2>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={80}>
        <div style={{ border: '1px solid var(--color-hairline)', overflow: 'hidden' }}>

          {/* Tab strip */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--color-surface-2)',
            borderBottom: '1px solid var(--color-hairline)',
            overflowX: 'auto',
          }}>
            {/* Window dots */}
            {/* Terminal header block */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 16px',
              borderRight: '1px solid var(--color-hairline)',
              height: '100%',
              flexShrink: 0,
              backgroundColor: 'var(--color-canvas)',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-mute)', fontWeight: 700 }}>[ TTY ]</span>
            </div>

            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActive(tab)}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  padding: '11px 18px',
                  color: active === tab ? 'var(--color-ink)' : 'var(--color-mute)',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRight: '1px solid var(--color-hairline)',
                  borderBottom: active === tab ? '2px solid var(--color-accent)' : '2px solid transparent',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s',
                  fontWeight: active === tab ? 600 : 400,
                }}
              >
                {tab}
              </button>
            ))}
            <div style={{ marginLeft: 'auto', paddingRight: 12, flexShrink: 0 }}>
              <CopyButton code={COPY_CONTENT[active]} />
            </div>
          </div>

          {/* Content area */}
          <div style={{ backgroundColor: 'var(--color-surface)' }}>

            {/* Markdown tab */}
            {active === 'audit-report.md' && (
              <div style={{ padding: '24px 28px' }}>
                <pre style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  lineHeight: 1.9,
                  color: 'var(--color-ink-light)',
                  whiteSpace: 'pre-wrap',
                  marginBottom: 24,
                }}>
                  {MD_CONTENT}
                </pre>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {FINDINGS.map(f => (
                    <div
                      key={f.title}
                      style={{
                        padding: '12px 16px',
                        borderTop: `1px solid ${SEV_BAR[f.sev]}`,
                        backgroundColor: 'var(--color-surface-2)',
                      }}
                    >
                      <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        fontSize: 13,
                        color: 'var(--color-ink)',
                        marginBottom: 4,
                      }}>
                        {f.title}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-mute)' }}>
                        <span style={{ color: 'var(--color-ink-light)' }}>{f.file}</span>
                        {' · '}
                        <code>{f.rule}</code>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-ok)', marginTop: 4 }}>
                        fix: {f.fix}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* JSON tab */}
            {active === 'audit-report.json' && (
              <div className="scroll-x" style={{ padding: '24px 28px' }}>
                <pre style={{ fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.85, color: 'var(--color-ink-light)', whiteSpace: 'pre', margin: 0 }}>
                  {JSON_CONTENT
                    .split('\n')
                    .map((line, i) => (
                      <div key={i} dangerouslySetInnerHTML={{ __html:
                        line
                          .replace(/"([^"]+)":/g, `<span style="color:var(--color-accent)">"$1"</span>:`)
                          .replace(/: "([^"]+)"/g, `: <span style="color:var(--color-ok)">"$1"</span>`)
                          .replace(/: (\d+)/g, `: <span style="color:var(--color-warn)">$1</span>`)
                      }} />
                    ))
                  }
                </pre>
              </div>
            )}

            {/* Terminal tab */}
            {active === 'terminal' && (
              <div className="scroll-x" style={{ backgroundColor: '#090910', padding: '24px 28px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.85, minWidth: 'max-content' }}>
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
