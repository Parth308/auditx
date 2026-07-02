import ScrollReveal from './ScrollReveal';
import CopyButton from './CopyButton';

const HR   = '1px solid rgba(0,0,0,0.09)';
const INK  = '#1a1a1a';
const MUTE = '#737373';

// Lightweight YAML syntax highlight — comments, keys, important strings
function YamlBlock({ code }: { code: string }) {
  const lines = code.split('\n').map((line, i) => {
    let html = line
      // Comments
      .replace(/^(\s*)(#.*)$/, '$1<span style="color:#737373">$2</span>')
      // YAML keys: "word:" at start of a line
      .replace(/^(\s*)([a-zA-Z_-]+)(:)/, '$1<span style="color:#7dd3fc">$2</span>$3')
      // on: [push, pull_request]
      .replace(/\[([^\]]+)\]/g, '[<span style="color:#86efac">$1</span>]')
      // Strings in single quotes
      .replace(/'([^']+)'/g, `'<span style="color:#fbbf24">$1</span>'`)
      // npx auditx command highlight
      .replace(/(npx auditx@latest)/g, '<span style="color:#a78bfa">$1</span>')
      // severity flag highlight
      .replace(/(--severity high)/g, '<span style="color:#f87171">$1</span>')
      // --ci flag
      .replace(/(--ci)/g, '<span style="color:#f87171">$1</span>')
      // actions/checkout etc
      .replace(/(actions\/[a-z@0-9-]+)/g, '<span style="color:#86efac">$1</span>');

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
  { marker: '[+]', ok: true,  text: 'pre-commit: scans staged files only — milliseconds' },
  { marker: '[+]', ok: true,  text: 'pre-push: full project scan before remote' },
  { marker: '[+]', ok: true,  text: 'post-merge: catch regressions after pulls' },
  { marker: '[+]', ok: true,  text: 'Preserves and chains existing husky hooks' },
  { marker: '[+]', ok: true,  text: '--staged-list: pass exact file list to runners' },
];

export default function CISection() {
  return (
    <section id="ci" className="page-section">
      <ScrollReveal>
        <div style={{ borderBottom: HR, paddingBottom: 12, marginBottom: 0 }}>
          <div style={{ fontFamily: 'inherit', fontSize: 20, fontWeight: 700, color: INK }}>
            [+] CI / Git hook integration
          </div>
          <div style={{ fontFamily: 'inherit', fontSize: 15, marginTop: 6, color: MUTE }}>
            Exit code 1 on findings. Drops into any pipeline. Hooks in one command.
          </div>
        </div>
      </ScrollReveal>

      <div className="ci-grid">
        {/* GitHub Actions block */}
        <ScrollReveal>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Block header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              backgroundColor: '#f5f4f2',
              borderBottom: HR,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontFamily: 'inherit',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: '#2563eb',
                }}>
                  GitHub Actions
                </span>
                <span style={{ fontFamily: 'inherit', fontSize: 11, color: MUTE }}>
                  .github/workflows/audit.yml
                </span>
              </div>
              <CopyButton code={GHA} />
            </div>
            {/* YAML with syntax highlight */}
            <div className="scroll-x" style={{ flex: 1, backgroundColor: '#0d0d0d', overflowX: 'auto' }}>
              <pre style={{
                fontFamily: 'inherit',
                fontSize: 12,
                padding: '18px 20px',
                lineHeight: 1.85,
                margin: 0,
                whiteSpace: 'pre',
                minWidth: 'max-content',
                color: '#d4d4d4',
              }}>
                <YamlBlock code={GHA} />
              </pre>
            </div>
          </div>
        </ScrollReveal>

        {/* Git hooks block */}
        <ScrollReveal delay={80}>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Block header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              backgroundColor: '#f5f4f2',
              borderBottom: HR,
            }}>
              <span style={{
                fontFamily: 'inherit',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: '#16a34a',
              }}>
                Git hooks
              </span>
              <CopyButton code={HOOK} />
            </div>
            {/* Hook commands */}
            <div className="scroll-x" style={{ backgroundColor: '#0d0d0d', overflowX: 'auto', borderBottom: HR }}>
              <pre style={{
                fontFamily: 'inherit',
                fontSize: 12,
                padding: '18px 20px',
                lineHeight: 1.85,
                margin: 0,
                whiteSpace: 'pre',
                minWidth: 'max-content',
                color: '#d4d4d4',
              }}>
                <YamlBlock code={HOOK} />
              </pre>
            </div>
            {/* Feature list */}
            <div style={{ padding: '16px 20px', flex: 1, backgroundColor: '#fafaf9' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {HOOK_FEATURES.map((f) => (
                  <div
                    key={f.text}
                    style={{
                      fontFamily: 'inherit',
                      fontSize: 14,
                      color: '#404040',
                      lineHeight: 1,
                      padding: '9px 0',
                      borderBottom: HR,
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 10,
                    }}
                  >
                    <span style={{ color: '#16a34a', fontWeight: 700, flexShrink: 0, fontSize: 13 }}>{f.marker}</span>
                    <span>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
