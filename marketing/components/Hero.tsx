import CopyButton from './CopyButton';
import TerminalDemo from './TerminalDemo';

const HR  = '1px solid rgba(0,0,0,0.09)';
const INK = '#1a1a1a';

const STATS = [
  { val: '18',   label: 'parallel scanners' },
  { val: '44',   label: 'AI-pattern rules' },
  { val: '0',    label: 'config required' },
  { val: '100%', label: 'local — no cloud' },
];

export default function Hero() {
  return (
    <section className="page-section">
      <div className="hero-container">
        <div className="hero-content">
          {/* Badge */}
          <div style={{
            display: 'inline-block',
            fontFamily: 'inherit',
            fontSize: 12,
            fontWeight: 600,
            lineHeight: 1.6,
            letterSpacing: '0.04em',
            padding: '4px 10px',
            backgroundColor: INK,
            color: '#fafaf9',
            marginBottom: 28,
          }}>
            [new] AI-code anti-patterns — 44 custom Semgrep rules
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 700,
            fontSize: 'clamp(32px, 4.5vw, 52px)',
            lineHeight: 1.2,
            letterSpacing: '-1px',
            color: INK,
            marginBottom: 20,
            maxWidth: 680,
          }}>
            One command. Every vulnerability.<br />
            AI-ready report.
          </h1>

          {/* Subtext */}
          <p style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 17,
            lineHeight: 1.7,
            color: '#404040',
            maxWidth: 580,
            marginBottom: 36,
          }}>
            auditx auto-detects your stack, then orchestrates 18 scanners
            in parallel across your CPU cores — secrets, deps, SAST, dead code,
            complexity, IaC, and AI-pattern anti-patterns. One command.
            One normalized report. No config.
          </p>

          {/* CTA row */}
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap',
            alignItems: 'stretch',
            gap: 16, 
            marginBottom: 64 
          }}>
            {/* The Command Block */}
            <div style={{
              display: 'flex',
              alignItems: 'stretch',
              border: '1px solid var(--color-hairline)',
              backgroundColor: '#fff',
              boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
            }}>
              <div style={{ 
                padding: '14px 20px', 
                fontFamily: 'var(--font-mono)', 
                fontSize: 15, 
                color: INK, 
                borderRight: '1px solid var(--color-hairline)',
                display: 'flex',
                alignItems: 'center'
              }}>
                npx auditx@latest .
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <CopyButton code="npx auditx@latest ." />
              </div>
            </div>

            {/* GitHub Button */}
            <a
              href="https://github.com/parth308/auditx"
              className="github-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-sans)',
                fontWeight: 600,
                fontSize: 15,
                padding: '0 24px',
                border: '1px solid var(--color-hairline)',
                transition: 'all 0.2s ease',
              }}
            >
              [→] GitHub
            </a>
          </div>

        </div>
        
        <div className="hero-visual">
          <TerminalDemo />
        </div>
      </div>

      {/* Stats Marquee (Full Width) */}
      <div style={{ width: '100%', maxWidth: 1440, margin: '96px auto 0' }}>
        <div className="marquee-container" style={{ margin: 0, padding: '48px 0', borderTop: '1px solid var(--color-hairline)', borderBottom: '1px solid var(--color-hairline)' }}>
          <div className="animate-marquee">
            {[0, 1, 2, 3].map((setIndex) => (
              <div key={setIndex} aria-hidden={setIndex > 0} style={{ display: 'flex', gap: 80, paddingRight: 80 }}>
                {STATS.map(({ val, label }) => (
                  <div key={`${setIndex}-${label}`} style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      fontSize: 32,
                      letterSpacing: '-1px',
                      color: INK,
                    }}>{val}</div>
                    <div style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 13,
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      color: '#737373',
                    }}>{label}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
