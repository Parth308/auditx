'use client';
import { useState, useEffect } from 'react';

const LINES = [
  { text: '$ npx auditx@latest .', color: '#fdfcfc', delay: 0 },
  { text: '', color: '', delay: 500 },
  { text: '  [+] auditx v0.1.33', color: '#fdfcfc', delay: 600 },
  { text: '  Scanning: /projects/my-app', color: '#9a9898', delay: 800 },
  { text: '', color: '', delay: 1000 },
  { text: '  Stack detected: Node.js · TypeScript · Docker', color: '#9a9898', delay: 1100 },
  { text: '  Running 15 scanners in parallel…', color: '#9a9898', delay: 1400 },
  { text: '', color: '', delay: 1600 },
  { text: '  [+] gitleaks (secrets)              clean  1.2s', color: '#16a34a', delay: 1800 },
  { text: '  [+] trivy (deps/CVEs)               clean  2.1s', color: '#16a34a', delay: 2100 },
  { text: '  [+] semgrep (SAST)                  clean  3.4s', color: '#16a34a', delay: 2400 },
  { text: '  [-] semgrep (ai patterns)     3 findings  4.1s', color: '#d97706', delay: 2800 },
  { text: '  [-] eslint (security patterns) 2 findings  1.8s', color: '#d97706', delay: 3100 },
  { text: '  [+] jscpd (duplication)             clean  5.2s', color: '#16a34a', delay: 3400 },
  { text: '  [+] tsc (typescript compiler)       clean  3.1s', color: '#16a34a', delay: 3700 },
  { text: '  [+] lizard (complexity)             clean  2.9s', color: '#16a34a', delay: 4000 },
  { text: '  [+] knip (dead code)                clean  4.5s', color: '#16a34a', delay: 4300 },
  { text: '', color: '', delay: 4600 },
  { text: '  [ OK ] Report written to: audit-report.md', color: '#fdfcfc', delay: 4800 },
  { text: '  auditx: [FAIL] 5 findings  (0 critical · 2 high · 3 medium)', color: '#dc2626', delay: 5100 },
];

export default function TerminalDemo() {
  const [visible, setVisible] = useState<Set<number>>(new Set());
  const [showCursor, setShowCursor] = useState(false);

  useEffect(() => {
    const timers = LINES.map((line, i) =>
      setTimeout(() => {
        setVisible(prev => new Set(prev).add(i));
        if (i === LINES.length - 1) setShowCursor(true);
      }, line.delay),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="hover-lift" style={{
      width: '100%',
      backgroundColor: '#141414',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      {/* Chrome bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '11px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#dc2626', display: 'inline-block', opacity: 0.8 }} />
        <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#d97706', display: 'inline-block', opacity: 0.8 }} />
        <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#16a34a', display: 'inline-block', opacity: 0.8 }} />
        <span style={{ marginLeft: 12, fontSize: 12, color: 'var(--color-mute)', fontFamily: 'inherit' }}>terminal</span>
      </div>

      {/* Body — fixed height, all lines pre-rendered, opacity animates in */}
      <div className="scroll-x" style={{ padding: '20px 24px', overflowX: 'auto' }}>
        <div style={{ fontSize: 13, lineHeight: 1.85, fontFamily: 'inherit', minWidth: 'max-content' }}>
          {LINES.map((line, i) => (
            <div
              key={i}
              style={{
                color: line.color || 'transparent',
                whiteSpace: 'pre',
                minHeight: '1.85em',
                opacity: visible.has(i) ? 1 : 0,
                transform: visible.has(i) ? 'translateY(0)' : 'translateY(4px)',
                transition: 'opacity 0.25s ease, transform 0.25s ease',
              }}
            >
              {line.text || '\u00A0'}
            </div>
          ))}
          <div style={{ minHeight: '1.85em', opacity: showCursor ? 1 : 0 }}>
            <span
              className="cursor-blink"
              style={{ display: 'inline-block', width: 8, height: 14, backgroundColor: 'var(--color-ink)', verticalAlign: 'middle' }}
            />
          </div>
        </div>
      </div>

      {/* Hint row */}
      <div style={{
        display: 'flex',
        gap: 24,
        padding: '10px 24px',
        fontSize: 12,
        color: 'var(--color-mute)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        fontFamily: 'inherit',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
      }}>
        <span>tab switch panel</span>
        <span>ctrl-c exit</span>
        <span>--output agent | json | markdown</span>
      </div>
    </div>
  );
}
