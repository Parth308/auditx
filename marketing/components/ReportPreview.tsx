import ScrollReveal from './ScrollReveal';
import CopyButton from './CopyButton';

const HR = '1px solid rgba(15,0,0,0.12)';
const FONT = 'inherit';

const SEV_BAR: Record<string, string> = {
  critical: '#ff3b30',
  high:     '#ff9f0a',
  medium:   '#007aff',
};

const FINDING_LINES = [
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
    title: '### [AI_CODE] AI Code Pattern: floating-promise',
    file: 'src/api/client.ts:82',
    rule: 'ai-floating-promise',
    fix: 'await the call or attach .catch()',
  },
  {
    sev: 'medium',
    title: '### [AI_CODE] AI Code Pattern: ts-any-cast',
    file: 'src/utils/parser.ts:31',
    rule: 'ai-ts-any-cast',
    fix: 'Type the value properly instead of casting to any',
  },
];

const SAMPLE_REPORT = `# 🛡️ auditx Security Report

**Target**: \`/projects/my-app\`
**Duration**: 9.4s · **Stack**: Node.js · TypeScript

## Summary

| Category    | 🔴 Critical | 🟠 High | 🟡 Medium |
|-------------|-------------|---------|-----------|
| SECRETS     |      1      |    —    |     —     |
| DEPS        |      —      |    3    |     5     |
| AI_CODE     |      —      |    —    |     3     |
| TYPE_SAFETY |      —      |    1    |     2     |
| **Total**   |    **1**    |  **4**  |   **10**  |

> ⚠️ 5 critical/high findings require immediate attention.`;

export default function ReportPreview() {
  return (
    <section id="report" style={{ maxWidth: 960, margin: '0 auto', padding: '96px 24px 0' }}>
      <ScrollReveal>
        <div style={{ borderBottom: HR, paddingBottom: 12, marginBottom: 32 }}>
          <div style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: '#201d1d' }}>
            [+] Live report preview
          </div>
          <div style={{ fontFamily: FONT, fontSize: 14, marginTop: 6, color: '#646262' }}>
            Real findings, real format. The report your team actually reads.
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={80}>
        <div style={{ border: HR }}>
          {/* Tab strip */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#f8f7f7',
            borderBottom: HR,
          }}>
            {['audit-report.md', 'audit-report.json', 'terminal'].map((tab, i) => (
              <div key={tab} style={{
                fontFamily: FONT,
                fontSize: 12,
                padding: '8px 16px',
                color: i === 0 ? '#201d1d' : '#646262',
                borderBottom: i === 0 ? '2px solid #201d1d' : 'none',
                borderRight: HR,
                cursor: 'default',
              }}>
                {tab}
              </div>
            ))}
            <div style={{ marginLeft: 'auto', paddingRight: 8 }}>
              <CopyButton code={SAMPLE_REPORT} />
            </div>
          </div>

          {/* Report summary block */}
          <div style={{ padding: '24px 28px', backgroundColor: '#fdfcfc', fontFamily: FONT }}>
            <pre style={{
              fontFamily: FONT,
              fontSize: 13,
              lineHeight: 1.9,
              color: '#201d1d',
              whiteSpace: 'pre-wrap',
              marginBottom: 24,
              overflowX: 'auto',
            }}>
              {SAMPLE_REPORT}
            </pre>

            {/* Finding cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {FINDING_LINES.map((f) => (
                <div
                  key={f.title}
                  style={{
                    paddingLeft: 12,
                    paddingTop: 10,
                    paddingBottom: 10,
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
                    <code style={{ color: '#424245' }}>{f.rule}</code>
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 12, color: '#646262', marginTop: 2 }}>
                    Fix: <span style={{ color: '#201d1d' }}>{f.fix}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
