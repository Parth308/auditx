import CopyButton from './CopyButton';
import TerminalDemo from './TerminalDemo';

const s = {
  section: {
    maxWidth: 960,
    margin: '0 auto',
    padding: '72px 24px 0',
  } as React.CSSProperties,
  badge: {
    display: 'inline-block',
    fontFamily: 'inherit',
    fontSize: 12,
    fontWeight: 500,
    padding: '3px 10px',
    borderRadius: 4,
    backgroundColor: '#201d1d',
    color: '#fdfcfc',
    marginBottom: 24,
  } as React.CSSProperties,
  h1: {
    fontFamily: 'inherit',
    fontWeight: 700,
    fontSize: 'clamp(28px, 4vw, 40px)',
    lineHeight: 1.35,
    color: '#201d1d',
    marginBottom: 16,
    maxWidth: 680,
  } as React.CSSProperties,
  sub: {
    fontFamily: 'inherit',
    fontSize: 16,
    lineHeight: 1.65,
    color: '#424245',
    maxWidth: 580,
    marginBottom: 36,
  } as React.CSSProperties,
  installRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
    gap: 12,
    marginBottom: 48,
  },
  installPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '10px 16px',
    borderRadius: 4,
    backgroundColor: '#f1eeee',
    border: '1px solid rgba(15,0,0,0.12)',
  } as React.CSSProperties,
  installCode: {
    fontFamily: 'inherit',
    fontSize: 15,
    color: '#201d1d',
  } as React.CSSProperties,
  ghLink: {
    fontFamily: 'inherit',
    fontSize: 14,
    fontWeight: 500,
    padding: '10px 20px',
    borderRadius: 4,
    border: '1px solid #646262',
    color: '#201d1d',
    backgroundColor: 'transparent',
  } as React.CSSProperties,
  statsRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 40,
    marginBottom: 48,
    paddingBottom: 48,
    borderBottom: '1px solid rgba(15,0,0,0.12)',
  },
  statVal: {
    fontFamily: 'inherit',
    fontWeight: 700,
    fontSize: 32,
    lineHeight: 1,
    color: '#201d1d',
  } as React.CSSProperties,
  statLabel: {
    fontFamily: 'inherit',
    fontSize: 13,
    marginTop: 4,
    color: '#646262',
  } as React.CSSProperties,
};

export default function Hero() {
  return (
    <section style={s.section}>
      <div style={s.badge}>[new] AI-code anti-patterns — 44 custom Semgrep rules</div>

      <h1 style={s.h1}>
        One command. Every vulnerability.<br />
        AI-ready report.
      </h1>

      <p style={s.sub}>
        auditx orchestrates 13 scanners in parallel — secrets, deps, SAST,
        dead code, complexity, AI-pattern anti-patterns, and more — then
        produces a single structured report built for both human review and AI
        agent loops.
      </p>

      <div style={s.installRow}>
        <div style={s.installPill}>
          <code style={s.installCode}>npx auditx@latest .</code>
          <CopyButton code="npx auditx@latest ." />
        </div>
        <a href="https://github.com/parth308/auditx" style={s.ghLink}>
          [→] GitHub
        </a>
      </div>

      <div style={s.statsRow}>
        {[
          { val: '13', label: 'scanner categories' },
          { val: '44', label: 'AI-pattern rules' },
          { val: '0',  label: 'config required' },
          { val: '100%', label: 'local — no cloud' },
        ].map(({ val, label }) => (
          <div key={label}>
            <div style={s.statVal}>{val}</div>
            <div style={s.statLabel}>{label}</div>
          </div>
        ))}
      </div>

      <TerminalDemo />
    </section>
  );
}
