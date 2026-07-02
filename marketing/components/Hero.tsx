import CopyButton from './CopyButton';
import TerminalDemo from './TerminalDemo';

const HR  = '1px solid rgba(0,0,0,0.09)';
const INK = '#1a1a1a';

const STATS = [
  { val: '13',   label: 'scanner categories' },
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
            auditx auto-detects your stack, then orchestrates 13 scanner categories
            in parallel across your CPU cores — secrets, deps, SAST, dead code,
            complexity, IaC, and AI-pattern anti-patterns. One command.
            One normalized report. No config.
          </p>

          {/* CTA row */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 mb-14 w-full">
            <div className="flex items-center justify-center gap-3 py-3 px-5 bg-[#f5f4f2] border border-[rgba(0,0,0,0.09)] w-full md:w-auto">
              <code style={{ fontFamily: 'inherit', fontSize: 15, color: INK }}>
                npx auditx@latest .
              </code>
              <CopyButton code="npx auditx@latest ." />
            </div>
            <a
              href="https://github.com/parth308/auditx"
              className="flex items-center justify-center font-medium py-3 px-5 border border-black/20 text-[#1a1a1a] bg-transparent w-full md:w-auto"
              style={{ fontFamily: 'inherit', fontSize: 15 }}
            >
              [→] GitHub
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:flex md:flex-row md:flex-nowrap mb-16 md:pb-16 md:border-b border-[var(--color-hairline)] w-full">
            {STATS.map(({ val, label }, i) => (
              <div 
                key={label} 
                className={`
                  flex flex-col justify-center
                  py-8 md:py-0
                  md:pr-10 md:mr-10
                  ${i % 2 === 0 ? 'border-r border-[var(--color-hairline)] pr-5 md:pr-10' : 'pl-5 md:pl-0'} 
                  ${i < 2 ? 'border-b border-[var(--color-hairline)] md:border-b-0' : ''}
                  ${i < STATS.length - 1 ? 'md:border-r md:border-[var(--color-hairline)]' : 'md:border-r-0'}
                `}
              >
                <div style={{
                  fontFamily: 'inherit',
                  fontWeight: 700,
                  fontSize: 40,
                  lineHeight: 1,
                  letterSpacing: '-2px',
                  color: INK,
                }}>{val}</div>
                <div style={{
                  fontFamily: 'inherit',
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#737373',
                  marginTop: 8,
                }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="hero-visual">
          <TerminalDemo />
        </div>
      </div>
    </section>
  );
}
