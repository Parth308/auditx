'use client';
import { useState, useEffect } from 'react';

// severity color map mirrors actual CLI output
const LINES = [
  { text: '$ npx auditx .', color: '#fdfcfc', delay: 0 },
  { text: '', color: '', delay: 500 },
  { text: '  🛡️  auditx v0.1.0', color: '#fdfcfc', delay: 600 },
  { text: '  Scanning: /projects/my-app', color: '#9a9898', delay: 800 },
  { text: '', color: '', delay: 1000 },
  { text: '  Stack detected: Node.js · TypeScript · Docker', color: '#9a9898', delay: 1100 },
  { text: '  Running 13 scanners in parallel…', color: '#9a9898', delay: 1400 },
  { text: '', color: '', delay: 1600 },
  { text: '  ✓ gitleaks (secrets)              clean  1.2s', color: '#30d158', delay: 1800 },
  { text: '  ✓ trivy (deps/CVEs)               clean  2.1s', color: '#30d158', delay: 2100 },
  { text: '  ✓ semgrep (SAST)                  clean  3.4s', color: '#30d158', delay: 2400 },
  { text: '  ✗ semgrep (ai patterns)     3 findings  4.1s', color: '#ff9f0a', delay: 2800 },
  { text: '  ✗ eslint (security patterns) 2 findings  1.8s', color: '#ff9f0a', delay: 3100 },
  { text: '  ✓ jscpd (duplication)             clean  5.2s', color: '#30d158', delay: 3400 },
  { text: '  ✓ tsc (typescript compiler)       clean  3.1s', color: '#30d158', delay: 3700 },
  { text: '  ✓ lizard (complexity)             clean  2.9s', color: '#30d158', delay: 4000 },
  { text: '  ✓ knip (dead code)                clean  4.5s', color: '#30d158', delay: 4300 },
  { text: '', color: '', delay: 4600 },
  { text: '  ✅ Report written to: audit-report.md', color: '#fdfcfc', delay: 4800 },
  { text: '  auditx: ❌ 5 findings  (0 critical · 2 high · 3 medium)', color: '#ff3b30', delay: 5100 },
];

export default function TerminalDemo() {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    const timers = LINES.map((_, i) =>
      setTimeout(() => setVisible(i + 1), LINES[i].delay),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div style={{
      width: '100%',
      backgroundColor: '#201d1d',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 0,
    }}>
      {/* Chrome bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ff3b30', display: 'inline-block' }} />
        <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ff9f0a', display: 'inline-block' }} />
        <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#30d158', display: 'inline-block' }} />
        <span style={{ marginLeft: 12, fontSize: 12, color: '#9a9898', fontFamily: 'inherit' }}>terminal</span>
      </div>

      {/* Body */}
      <div style={{ padding: '20px 24px', minHeight: 360 }}>
        <div style={{ fontSize: 13, lineHeight: 1.8, fontFamily: 'inherit' }}>
          {LINES.slice(0, visible).map((line, i) => (
            <div
              key={i}
              className="animate-fade-up"
              style={{ color: line.color || 'transparent', whiteSpace: 'pre', minHeight: '1.8em' }}
            >
              {line.text || '\u00A0'}
            </div>
          ))}
          {visible > 0 && (
            <span
              className="cursor-blink"
              style={{ display: 'inline-block', width: 8, height: 14, backgroundColor: '#fdfcfc', verticalAlign: 'middle' }}
            />
          )}
        </div>
      </div>

      {/* Hint row */}
      <div style={{
        display: 'flex',
        gap: 24,
        padding: '8px 24px',
        fontSize: 11,
        color: '#9a9898',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        fontFamily: 'inherit',
      }}>
        <span>tab switch panel</span>
        <span>ctrl-c exit</span>
        <span>--output agent | json | markdown</span>
      </div>
    </div>
  );
}
