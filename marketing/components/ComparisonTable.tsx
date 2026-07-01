import ScrollReveal from './ScrollReveal';

const HR = '1px solid rgba(15,0,0,0.12)';
const FONT = 'inherit';

const ROWS = [
  { feature: 'Setup time',            manual: 'Hours — 5+ tools, configs, docs',   auditx: '0 minutes — npx auditx .' },
  { feature: 'Secrets scanning',      manual: 'Gitleaks alone, separate step',      auditx: '[+] Integrated, runs in parallel' },
  { feature: 'Dep vulnerability',     manual: 'Trivy or Snyk, separate output',     auditx: '[+] Trivy + npm audit, one schema' },
  { feature: 'AI code anti-patterns', manual: '[-] Nobody does this',               auditx: '[+] 44 custom rules — only auditx' },
  { feature: 'AI agent output',       manual: '[-] Parse 5 JSON schemas manually',  auditx: '[+] --output agent: clean JSON' },
  { feature: 'Git hooks',             manual: 'Write husky config per tool',        auditx: '[+] auditx hook install' },
  { feature: 'Maintenance',           manual: 'Update each tool independently',     auditx: '[+] One dep. One version.' },
  { feature: 'Data privacy',          manual: 'Snyk sends deps to cloud',           auditx: '[+] 100% local' },
];

export default function ComparisonTable() {
  return (
    <section id="compare" className="page-section">
      <ScrollReveal>
        <div style={{ borderBottom: HR, paddingBottom: 12, marginBottom: 32 }}>
          <div style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: '#201d1d' }}>
            [+] auditx vs. manual toolchain
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={80}>
        {/* comparison-wrap adds overflow-x: auto on narrow screens */}
        <div className="comparison-wrap">
          <table className="comparison-table" style={{ borderCollapse: 'collapse', fontFamily: FONT }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f7f7', borderBottom: HR }}>
                <th style={{ fontWeight: 700, fontSize: 12, padding: '10px 12px', textAlign: 'left', color: '#646262', borderRight: HR, width: '25%' }}>Feature</th>
                <th style={{ fontWeight: 700, fontSize: 12, padding: '10px 12px', textAlign: 'left', color: '#646262', borderRight: HR, width: '37.5%' }}>Manual (eslint + semgrep + trivy…)</th>
                <th style={{ fontWeight: 700, fontSize: 12, padding: '10px 12px', textAlign: 'left', color: '#201d1d', width: '37.5%' }}>auditx</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <tr
                  key={row.feature}
                  style={{ borderBottom: i < ROWS.length - 1 ? HR : 'none', backgroundColor: i % 2 === 1 ? '#f8f7f7' : 'transparent' }}
                >
                  <td style={{ fontWeight: 500, fontSize: 13, padding: '10px 12px', color: '#201d1d', borderRight: HR }}>{row.feature}</td>
                  <td style={{ fontSize: 13, padding: '10px 12px', color: row.manual.startsWith('[-]') ? '#ff3b30' : '#646262', borderRight: HR }}>{row.manual}</td>
                  <td style={{ fontSize: 13, padding: '10px 12px', color: row.auditx.startsWith('[+]') ? '#30d158' : '#201d1d' }}>{row.auditx}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScrollReveal>
    </section>
  );
}
