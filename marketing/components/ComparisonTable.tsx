import ScrollReveal from './ScrollReveal';

const HR = '1px solid var(--color-hairline)';

const ROWS = [
  {
    feature: 'Execution Speed',
    snyk: 'Cloud upload + ML scan (~45s+)',
    sonarqube: 'Heavy Java build (minutes)',
    auditx: 'Local AST — under 10s',
    win: true,
  },
  {
    feature: 'Execution Model',
    snyk: 'Requires SaaS account',
    sonarqube: 'Requires server hosting',
    auditx: '100% local CLI — zero config',
    win: true,
  },
  {
    feature: 'Scope',
    snyk: 'SCA, SAST, IaC',
    sonarqube: 'SAST, code quality',
    auditx: '15 scanners — Secrets, AI patterns, dead code + more',
    win: true,
  },
  {
    feature: 'Data Privacy',
    snyk: 'Sends code to cloud',
    sonarqube: 'Depends on host',
    auditx: 'Code never leaves machine',
    win: true,
  },
  {
    feature: 'Setup Time',
    snyk: 'API keys, configs',
    sonarqube: 'Database, JVM, plugins',
    auditx: '0 minutes — npx auditx@latest .',
    win: true,
  },
  {
    feature: 'Price',
    snyk: 'Expensive enterprise',
    sonarqube: 'Expensive enterprise',
    auditx: 'Free & open source — MIT',
    win: true,
  },
];

export default function ComparisonTable() {
  return (
    <section id="compare" className="page-section" style={{ paddingBottom: 0 }}>
      <ScrollReveal>
        <div style={{ marginBottom: 36 }}>
          <div className="section-label">Comparison</div>
          <h2 style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'clamp(24px, 3vw, 36px)',
            fontWeight: 800,
            letterSpacing: '-0.8px',
            color: 'var(--color-ink)',
            lineHeight: 1.2,
          }}>
            auditx vs. Industry Standards
          </h2>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={80}>
        <div className="comparison-wrap">
          <table className="comparison-table" style={{ fontFamily: 'var(--font-mono)' }}>
            <colgroup>
              <col style={{ width: '20%' }} />
              <col style={{ width: '27%' }} />
              <col style={{ width: '27%' }} />
              <col style={{ width: '26%' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', padding: '12px 16px',
                  textAlign: 'left', color: 'var(--color-mute)',
                  borderRight: HR, borderBottom: HR,
                  backgroundColor: 'var(--color-surface-2)',
                }}>
                  Benchmark
                </th>
                <th style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', padding: '12px 16px',
                  textAlign: 'left', color: 'var(--color-mute)',
                  borderRight: HR, borderBottom: HR,
                  backgroundColor: 'var(--color-surface-2)',
                }}>
                  Snyk
                </th>
                <th style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', padding: '12px 16px',
                  textAlign: 'left', color: 'var(--color-mute)',
                  borderRight: HR, borderBottom: HR,
                  backgroundColor: 'var(--color-surface-2)',
                }}>
                  SonarQube
                </th>
                <th style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', padding: '12px 16px',
                  textAlign: 'left', color: 'var(--color-accent)',
                  borderBottom: `2px solid var(--color-accent)`,
                  backgroundColor: 'rgba(34,211,238,0.06)',
                }}>
                  auditx
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <tr key={row.feature} style={{ borderBottom: i < ROWS.length - 1 ? HR : 'none' }}>
                  <td style={{
                    fontWeight: 600,
                    fontSize: 13,
                    padding: '14px 16px',
                    color: 'var(--color-ink)',
                    borderRight: HR,
                    verticalAlign: 'middle',
                  }}>
                    {row.feature}
                  </td>
                  <td style={{
                    fontSize: 13,
                    padding: '14px 16px',
                    color: 'var(--color-mute)',
                    borderRight: HR,
                    verticalAlign: 'middle',
                  }}>
                    {row.snyk}
                  </td>
                  <td style={{
                    fontSize: 13,
                    padding: '14px 16px',
                    color: 'var(--color-mute)',
                    borderRight: HR,
                    verticalAlign: 'middle',
                  }}>
                    {row.sonarqube}
                  </td>
                  <td style={{
                    fontSize: 13,
                    padding: '14px 16px',
                    color: row.win ? 'var(--color-ok)' : 'var(--color-ink)',
                    fontWeight: row.win ? 600 : 400,
                    backgroundColor: row.win ? 'rgba(52,211,153,0.05)' : 'transparent',
                    verticalAlign: 'middle',
                  }}>
                    {row.win && <span style={{ marginRight: 6, opacity: 0.8 }}>[+]</span>}
                    {row.auditx}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScrollReveal>
    </section>
  );
}
