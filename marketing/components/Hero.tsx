import CopyButton from './CopyButton';
import TerminalDemo from './TerminalDemo';

const STATS = [
  { val: '22', label: 'parallel scanners' },
  { val: '100+', label: 'AI-pattern rules' },
  { val: '0', label: 'config required' },
  { val: '100%', label: 'local — no cloud' },
];

export default function Hero() {
  return (
    <section className="page-section" style={{ paddingTop: 72, paddingBottom: 0 }}>
      <div className="hero-container">

        {/* ── Left: Content ── */}
        <div className="hero-content">



          <h1 style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 800,
            fontSize: 'clamp(36px, 5vw, 62px)',
            lineHeight: 1.08,
            letterSpacing: '-2px',
            color: 'var(--color-ink)',
            marginBottom: 22,
            maxWidth: 640,
          }}>
            One command.<br />
            <span style={{ color: 'var(--color-accent)' }}>Every</span>{' '}
            vulnerability.<br />
            AI-ready report.
          </h1>

          {/* Subtext */}
          <p style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 17,
            lineHeight: 1.75,
            color: 'var(--color-ink-light)',
            maxWidth: 520,
            marginBottom: 40,
            fontWeight: 400,
          }}>
            auditx auto-detects your stack, orchestrates{' '}
            <strong style={{ color: 'var(--color-ink)', fontWeight: 700 }}>22 scanners</strong>{' '}
            in parallel — secrets, deps, SAST, dead code, complexity,
            IaC, and AI-pattern anti-patterns. One command. One normalized report.
          </p>

          {/* CTA row */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'stretch',
            gap: 12,
            marginBottom: 56,
          }}>
            {/* Command block */}
            <div style={{
              display: 'flex',
              alignItems: 'stretch',
              border: '1px solid var(--color-hairline)',
              backgroundColor: 'var(--color-surface)',
            }}>
              <div style={{
                padding: '12px 20px',
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                color: 'var(--color-ink)',
                borderRight: '1px solid var(--color-hairline)',
                display: 'flex',
                alignItems: 'center',
              }}>
                npx auditx@latest .
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <CopyButton code="npx auditx@latest ." />
              </div>
            </div>

            {/* GitHub link */}
            <a
              href="https://github.com/parth308/auditx"
              className="btn-ghost"
              style={{ padding: '12px 24px' }}
            >
              [→] GitHub
            </a>
          </div>
        </div>

        {/* ── Right: Terminal ── */}
        <div className="hero-visual" style={{ position: 'relative' }}>
          {/* Glow behind terminal */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            width: '80%',
            height: '60%',
            background: 'radial-gradient(ellipse at center, rgba(234,88,12,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: 0,
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <TerminalDemo />
          </div>
        </div>
      </div>

      {/* Stats Marquee */}
      <div style={{ marginTop: 80 }}>
        <div className="marquee-container" style={{
          borderTop: '1px solid var(--color-hairline)',
          borderBottom: '1px solid var(--color-hairline)',
        }}>
          <div className="animate-marquee">
            {[0, 1, 2, 3].map((setIndex) => (
              <div key={setIndex} aria-hidden={setIndex > 0} style={{ display: 'flex', gap: 80, paddingRight: 80 }}>
                {STATS.map(({ val, label }) => (
                  <div key={`${setIndex}-${label}`} style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                    <div style={{
                      fontFamily: 'var(--font-sans)',
                      fontWeight: 800,
                      fontSize: 30,
                      letterSpacing: '-1px',
                      color: 'var(--color-ink)',
                    }}>{val}</div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      fontWeight: 500,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: 'var(--color-mute)',
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
