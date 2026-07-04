import ScrollReveal from './ScrollReveal';
import CopyButton from './CopyButton';

const HR = '1px solid var(--color-hairline)';

function YamlBlock({ code }: { code: string }) {
  const lines = code.split('\n').map((line, i) => {
    const html = line
      .replace(/^(\s*)(#.*)$/, '$1<span style="color:var(--color-mute)">$2</span>')
      .replace(/^(\s*)([a-zA-Z_-]+)(:)/, '$1<span style="color:#22d3ee">$2</span>$3')
      .replace(/\[([^\]]+)\]/g, '[<span style="color:#34d399">$1</span>]')
      .replace(/'([^']+)'/g, `'<span style="color:#fb923c">$1</span>'`)
      .replace(/(npx auditx@latest)/g, '<span style="color:var(--color-accent)">$1</span>')
      .replace(/(--severity high)/g, '<span style="color:var(--color-danger)">$1</span>')
      .replace(/(--ci)/g, '<span style="color:var(--color-danger)">$1</span>')
      .replace(/(actions\/[a-z@0-9-]+)/g, '<span style="color:#34d399">$1</span>');
    return <div key={i} dangerouslySetInnerHTML={{ __html: html || '\u00A0' }} />;
  });
  return <>{lines}</>;
}

const GHA = `# .github/workflows/audit.yml
name: Security Audit
on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Run auditx
        run: npx auditx@latest . --severity high --ci
      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: audit-report
          path: audit-report.md`;

const HOOK = `# Install pre-commit + pre-push hooks
auditx hook install

# Or install specific hooks
auditx hook install --pre-commit
auditx hook install --pre-push

# Hooks run on staged files only — fast.
# Full project scan on push.`;

const HOOK_FEATURES = [
  'pre-commit: scans staged files only — milliseconds',
  'pre-push: full project scan before remote',
  'post-merge: catch regressions after pulls',
  'Preserves and chains existing husky hooks',
  '--staged-list: pass exact file list to runners',
];

export default function CISection() {
  return (
    <section id="ci" className="page-section">
      <ScrollReveal>
        <div style={{ marginBottom: 36 }}>
          <div className="section-label">CI / Git Hooks</div>
          <h2 style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'clamp(24px, 3vw, 36px)',
            fontWeight: 800,
            letterSpacing: '-0.8px',
            color: 'var(--color-ink)',
            lineHeight: 1.2,
          }}>
            Exit code 1 on findings.<br />Drops into any pipeline.
          </h2>
        </div>
      </ScrollReveal>

      <div className="ci-grid">
        {/* GitHub Actions block */}
        <ScrollReveal>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              backgroundColor: 'var(--color-surface-2)',
              borderBottom: HR,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--color-accent)',
                }}>
                  GitHub Actions
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-mute)' }}>
                  audit.yml
                </span>
              </div>
              <CopyButton code={GHA} />
            </div>

            {/* YAML */}
            <div className="scroll-x" style={{ flex: 1, backgroundColor: '#090910', overflowX: 'auto' }}>
              <pre style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                padding: '18px 20px',
                lineHeight: 1.85,
                margin: 0,
                whiteSpace: 'pre',
                minWidth: 'max-content',
                color: 'var(--color-ink-light)',
              }}>
                <YamlBlock code={GHA} />
              </pre>
            </div>
          </div>
        </ScrollReveal>

        {/* Git hooks block */}
        <ScrollReveal delay={80}>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              backgroundColor: 'var(--color-surface-2)',
              borderBottom: HR,
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--color-ok)',
              }}>
                Git Hooks
              </span>
              <CopyButton code={HOOK} />
            </div>

            {/* Hook commands */}
            <div className="scroll-x" style={{ backgroundColor: '#090910', overflowX: 'auto', borderBottom: HR }}>
              <pre style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                padding: '18px 20px',
                lineHeight: 1.85,
                margin: 0,
                whiteSpace: 'pre',
                minWidth: 'max-content',
                color: 'var(--color-ink-light)',
              }}>
                <YamlBlock code={HOOK} />
              </pre>
            </div>

            {/* Feature list */}
            <div style={{ padding: '16px 20px', flex: 1, backgroundColor: 'var(--color-surface)' }}>
              {HOOK_FEATURES.map((text) => (
                <div
                  key={text}
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 14,
                    color: 'var(--color-ink-light)',
                    padding: '9px 0',
                    borderBottom: HR,
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 10,
                  }}
                >
                  <span style={{ color: 'var(--color-ok)', fontWeight: 700, flexShrink: 0, fontSize: 13 }}>
                    [+]
                  </span>
                  {text}
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
