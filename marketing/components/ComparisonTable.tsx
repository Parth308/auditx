import ScrollReveal from './ScrollReveal';

const INK  = '#1a1a1a';
const MUTE = '#737373';
const HR   = '1px solid rgba(0,0,0,0.09)';

const ROWS = [
  { feature: 'Setup time',            manual: 'Hours — 5+ tools, configs, docs',   auditx: '0 minutes — npx auditx@latest .' },
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
    <section id="compare" className="page-section" style={{ paddingBottom: 0 }}>
      <ScrollReveal>
        <div style={{ borderBottom: HR, paddingBottom: 12, marginBottom: 32 }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 700, color: INK }}>
            [+] auditx vs. manual toolchain
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={80}>
        <div className="comparison-wrap">
          <table className="comparison-table" style={{ fontFamily: 'inherit' }}>
            <colgroup>
              <col style={{ width: '28%' }} />
              <col style={{ width: '36%' }} />
              <col style={{ width: '36%' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{
                  fontWeight: 700, fontSize: 11, letterSpacing: '0.07em',
                  textTransform: 'uppercase', padding: '10px 14px',
                  textAlign: 'left', color: MUTE,
                  borderRight: HR, borderBottom: HR,
                  backgroundColor: '#f5f4f2',
                }}>
                  Feature
                </th>
                <th style={{
                  fontWeight: 700, fontSize: 11, letterSpacing: '0.07em',
                  textTransform: 'uppercase', padding: '10px 14px',
                  textAlign: 'left', color: '#737373',
                  borderRight: HR, borderBottom: HR,
                  backgroundColor: '#f5f4f2',
                }}>
                  Manual toolchain
                </th>
                {/* Winner column — clearly highlighted */}
                <th style={{
                  fontWeight: 700, fontSize: 11, letterSpacing: '0.07em',
                  textTransform: 'uppercase', padding: '10px 14px',
                  textAlign: 'left', color: '#1a1a1a',
                  borderBottom: '2px solid #1a1a1a',
                  backgroundColor: '#e8e6e1',
                }}>
                  auditx ✓
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => {
                const isAuditxWin = row.auditx.startsWith('[+]');
                const isManualBad = row.manual.startsWith('[-]');
                return (
                  <tr key={row.feature} style={{ borderBottom: i < ROWS.length - 1 ? HR : 'none' }}>
                    <td style={{
                      fontWeight: 500, fontSize: 14, padding: '11px 14px',
                      color: INK, borderRight: HR, verticalAlign: 'top',
                    }}>
                      {row.feature}
                    </td>
                    <td style={{
                      fontSize: 14, padding: '11px 14px',
                      color: isManualBad ? '#dc2626' : '#737373',
                      borderRight: HR, verticalAlign: 'top',
                    }}>
                      {row.manual}
                    </td>
                    <td style={{
                      fontSize: 14, padding: '11px 14px',
                      color: isAuditxWin ? '#16a34a' : INK,
                      fontWeight: isAuditxWin ? 500 : 400,
                      backgroundColor: '#f9f8f6',
                      verticalAlign: 'top',
                    }}>
                      {row.auditx}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ScrollReveal>
    </section>
  );
}
