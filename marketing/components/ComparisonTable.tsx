import ScrollReveal from './ScrollReveal';

const INK  = '#1a1a1a';
const MUTE = '#737373';
const HR   = '1px solid rgba(0,0,0,0.09)';

const ROWS = [
  { feature: 'Execution Speed', snyk: 'Cloud Upload + ML (~45s+)', sonarqube: 'Heavy Java Build (Minutes)', auditx: '[+] Local AST (Under 10s)' },
  { feature: 'Execution Model', snyk: 'Requires SaaS Account', sonarqube: 'Requires Server Hosting', auditx: '[+] 100% Local CLI (Zero Config)' },
  { feature: 'Scope', snyk: 'SCA, SAST, IaC', sonarqube: 'SAST, Code Quality', auditx: '[+] 13 Scanners (Secrets, AI, Dead Code, etc)' },
  { feature: 'Data Privacy', snyk: '[-] Sends code to cloud', sonarqube: 'Depends on host', auditx: '[+] Code never leaves machine' },
  { feature: 'Setup Time', snyk: 'API Keys, Configs', sonarqube: 'Database, JVM, Plugins', auditx: '[+] 0 minutes — npx auditx@latest .' },
  { feature: 'Price', snyk: 'Expensive Enterprise', sonarqube: 'Expensive Enterprise', auditx: '[+] Free & Open Source' },
];

export default function ComparisonTable() {
  return (
    <section id="compare" className="page-section" style={{ paddingBottom: 0 }}>
      <ScrollReveal>
        <div style={{ borderBottom: HR, paddingBottom: 12, marginBottom: 32 }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 700, color: INK }}>
            [+] auditx vs. Industry Standards
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={80}>
        <div className="comparison-wrap">
          <table className="comparison-table" style={{ fontFamily: 'inherit', minWidth: 800 }}>
            <colgroup>
              <col style={{ width: '22%' }} />
              <col style={{ width: '26%' }} />
              <col style={{ width: '26%' }} />
              <col style={{ width: '26%' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{
                  fontWeight: 700, fontSize: 11, letterSpacing: '0.07em',
                  textTransform: 'uppercase', padding: '12px 16px',
                  textAlign: 'left', color: MUTE,
                  borderRight: HR, borderBottom: HR,
                  backgroundColor: '#f5f4f2',
                }}>
                  Benchmark
                </th>
                <th style={{
                  fontWeight: 700, fontSize: 11, letterSpacing: '0.07em',
                  textTransform: 'uppercase', padding: '12px 16px',
                  textAlign: 'left', color: '#737373',
                  borderRight: HR, borderBottom: HR,
                  backgroundColor: '#f5f4f2',
                }}>
                  Snyk
                </th>
                <th style={{
                  fontWeight: 700, fontSize: 11, letterSpacing: '0.07em',
                  textTransform: 'uppercase', padding: '12px 16px',
                  textAlign: 'left', color: '#737373',
                  borderRight: HR, borderBottom: HR,
                  backgroundColor: '#f5f4f2',
                }}>
                  SonarQube
                </th>
                <th style={{
                  fontWeight: 700, fontSize: 11, letterSpacing: '0.07em',
                  textTransform: 'uppercase', padding: '12px 16px',
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
                return (
                  <tr key={row.feature} style={{ borderBottom: i < ROWS.length - 1 ? HR : 'none' }}>
                    <td style={{
                      fontWeight: 600, fontSize: 13, padding: '14px 16px',
                      color: INK, borderRight: HR, verticalAlign: 'middle',
                    }}>
                      {row.feature}
                    </td>
                    <td style={{
                      fontSize: 13, padding: '14px 16px',
                      color: '#737373', borderRight: HR, verticalAlign: 'middle',
                    }}>
                      {row.snyk}
                    </td>
                    <td style={{
                      fontSize: 13, padding: '14px 16px',
                      color: '#737373', borderRight: HR, verticalAlign: 'middle',
                    }}>
                      {row.sonarqube}
                    </td>
                    <td style={{
                      fontSize: 14, padding: '14px 16px',
                      color: isAuditxWin ? '#16a34a' : INK,
                      fontWeight: isAuditxWin ? 600 : 400,
                      backgroundColor: '#f9f8f6', verticalAlign: 'middle',
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
