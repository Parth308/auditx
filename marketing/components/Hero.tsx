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
    <section style={{ maxWidth: 960, margin: '0 auto', padding: '80px 24px 0' }}>
      {/* Badge */}
      <div style={{
        display: 'inline-block',
        fontFamily: 'inherit',
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '0.04em',
        padding: '3px 10px',
        backgroundColor: INK,
        color: '#fafaf9',
        marginBottom: 28,
      }}>
        [new] AI-code anti-patterns — 44 custom Semgrep rules
      </div>

      {/* Headline */}
      <h1 style={{
        fontFamily: 'inherit',
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
        fontFamily: 'inherit',
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
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 56 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '11px 18px',
          backgroundColor: '#f5f4f2',
          border: '1px solid rgba(0,0,0,0.09)',
        }}>
          <code style={{ fontFamily: 'inherit', fontSize: 15, color: INK }}>
            npx auditx@latest .
          </code>
          <CopyButton code="npx auditx@latest ." />
        </div>
        <a
          href="https://github.com/parth308/auditx"
          style={{
            fontFamily: 'inherit',
            fontSize: 15,
            fontWeight: 500,
            padding: '11px 20px',
            border: '1px solid rgba(0,0,0,0.2)',
            color: INK,
            backgroundColor: 'transparent',
          }}
        >
          [→] GitHub
        </a>
      </div>

      {/* Stats */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0,
        marginBottom: 60,
        paddingBottom: 60,
        borderBottom: HR,
      }}>
        {STATS.map(({ val, label }, i) => (
          <div key={label} style={{
            paddingRight: 40,
            marginRight: 40,
            borderRight: i < STATS.length - 1 ? HR : 'none',
          }}>
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

      <TerminalDemo />
    </section>
  );
}
