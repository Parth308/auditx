import ScrollReveal from './ScrollReveal';

const HR = '1px solid rgba(15,0,0,0.12)';
const FONT = 'inherit';

const ROWS = [
  { feature: 'Setup time',           manual: 'Hours — 5+ tools, configs, docs',   auditx: '0 minutes — npx auditx .' },
  { feature: 'Secrets scanning',     manual: 'Gitleaks alone, separate step',     auditx: '[+] Integrated, parallel' },
  { feature: 'Dep vulnerability',    manual: 'Trivy or Snyk, separate output',    auditx: '[+] Trivy + npm audit, one schema' },
  { feature: 'AI code anti-patterns',manual: '[-] Nobody does this',              auditx: '[+] 44 custom rules — only auditx' },
  { feature: 'AI agent output',      manual: '[-] Parse 5 JSON schemas manually', auditx: '[+] --output agent: clean JSON' },
  { feature: 'Git hooks',            manual: 'Write husky hooks per tool',         auditx: '[+] auditx hook install' },
  { feature: 'Maintenance',          manual: 'Update each tool independently',    auditx: '[+] One dep. One version.' },
  { feature: 'Data privacy',         manual: 'Snyk sends deps to cloud',          auditx: '[+] 100% local' },
];

export default function ComparisonTable() {
  return (
    <section id="compare" style={{ maxWidth: 960, margin: '0 auto', padding: '96px 24px 0' }}>
      <ScrollReveal>
        <div style={{ borderBottom: HR, paddingBottom: 12, marginBottom: 32 }}>
          <div style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: '#201d1d' }}>
            [+] auditx vs. manual toolchain
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={80}>
        <div style={{ border: HR }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.5fr',
            borderBottom: HR, backgroundColor: '#f8f7f7',
          }}>
            {['Feature', 'Manual (eslint + semgrep + trivy…)', 'auditx'].map((h, i) => (
              <div key={h} style={{
                fontFamily: FONT, fontWeight: 700, fontSize: 12,
                padding: '10px 12px', color: i === 2 ? '#201d1d' : '#646262',
                borderRight: i < 2 ? HR : 'none',
              }}>
                {h}
              </div>
            ))}
          </div>

          {ROWS.map((row, i) => (
            <div
              key={row.feature}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1.5fr 1.5fr',
                borderBottom: i < ROWS.length - 1 ? HR : 'none',
                backgroundColor: i % 2 === 1 ? '#f8f7f7' : 'transparent',
              }}
            >
              <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 13, padding: '10px 12px', color: '#201d1d', borderRight: HR }}>
                {row.feature}
              </div>
              <div style={{
                fontFamily: FONT, fontSize: 13, padding: '10px 12px',
                color: row.manual.startsWith('[-]') ? '#ff3b30' : '#646262',
                borderRight: HR,
              }}>
                {row.manual}
              </div>
              <div style={{
                fontFamily: FONT, fontSize: 13, padding: '10px 12px',
                color: row.auditx.startsWith('[+]') ? '#30d158' : '#201d1d',
              }}>
                {row.auditx}
              </div>
            </div>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}
