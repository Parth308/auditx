import ScrollReveal from './ScrollReveal';

const PROBLEMS = [
  {
    num: '01',
    marker: 'OPPORTUNITY',
    markerColor: 'var(--color-ok)',
    label: 'AI writes code in seconds',
    detail: 'Copilot, Cursor, Claude Code — your team ships 3× faster. That\'s the upside.',
  },
  {
    num: '02',
    marker: 'RISK',
    markerColor: 'var(--color-danger)',
    label: 'AI doesn\'t audit itself',
    detail: 'Silent catch blocks, floating promises, ts-any-cast, useEffect with no deps — these patterns ship constantly because no existing linter targets AI-generation anti-patterns specifically.',
  },
  {
    num: '03',
    marker: 'PAIN',
    markerColor: 'var(--color-warn)',
    label: 'Manual toolchain is brutal',
    detail: 'Semgrep + Trivy + Gitleaks + ESLint + Knip = 5 CLIs, 5 JSON schemas, 5 update cycles, and still zero AI-pattern coverage.',
  },
  {
    num: '04',
    marker: 'SOLUTION',
    markerColor: 'var(--color-accent)',
    label: 'auditx is the trust layer',
    detail: '100+ custom rules built from real AI codegen failure modes. One command, parallel execution, structured output that AI agents can parse and self-fix.',
  },
];

const CODE_LINES = [
  { sev: 'WARN',  sevColor: 'var(--color-warn)',   name: 'ai-silent-catch       ', code: 'try { ... } catch (e) { }' },
  { sev: 'WARN',  sevColor: 'var(--color-warn)',   name: 'ai-floating-promise   ', code: 'fetch(url)  // no await, no .catch' },
  { sev: 'WARN',  sevColor: 'var(--color-warn)',   name: 'ai-ts-any-cast        ', code: 'const val = data as any' },
  { sev: 'ERROR', sevColor: 'var(--color-danger)', name: 'ai-react-state-mutate ', code: 'state.items.push(newItem)' },
  { sev: 'WARN',  sevColor: 'var(--color-warn)',   name: 'ai-promise-in-loop    ', code: 'for (const x of items) { await save(x) }' },
];

export default function ProblemSection() {
  return (
    <section style={{ maxWidth: 980, margin: '0 auto', padding: '100px 28px 0' }}>
      <ScrollReveal>
        <div style={{ marginBottom: 48 }}>
          <h2 style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'clamp(26px, 3.5vw, 38px)',
            fontWeight: 800,
            letterSpacing: '-1px',
            color: 'var(--color-ink)',
            lineHeight: 1.15,
            maxWidth: 560,
          }}>
            AI-assisted code ships fast.<br />It doesn't ship safe.
          </h2>
        </div>
      </ScrollReveal>

      {/* Problem cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {PROBLEMS.map((p, i) => (
          <ScrollReveal key={p.label} delay={i * 60}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '80px 1fr',
              gap: 0,
              borderTop: '1px solid var(--color-hairline)',
              padding: '24px 0',
              alignItems: 'start',
            }}>
              {/* Number col */}
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--color-ash)',
                paddingTop: 4,
                letterSpacing: '0.06em',
              }}>
                {p.num}
              </div>

              {/* Content col */}
              <div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  color: p.markerColor,
                  marginBottom: 8,
                  padding: '2px 8px',
                  border: `1px solid ${p.markerColor}`,
                  opacity: 0.85,
                }}>
                  {p.marker}
                </div>
                <div style={{
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 700,
                  fontSize: 18,
                  color: 'var(--color-ink)',
                  marginBottom: 8,
                  letterSpacing: '-0.3px',
                }}>
                  {p.label}
                </div>
                <div style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 15,
                  lineHeight: 1.75,
                  color: 'var(--color-ink-light)',
                }}>
                  {p.detail}
                </div>
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>

      {/* Code callout */}
      <ScrollReveal delay={280}>
        <div style={{
          marginTop: 40,
          borderTop: '1px solid var(--color-hairline)',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-hairline)',
          overflow: 'hidden',
        }}>
          {/* Code block header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            borderBottom: '1px solid var(--color-hairline)',
            backgroundColor: 'var(--color-surface-2)',
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--color-mute)',
              letterSpacing: '0.06em',
            }}>
              // real AI-generated anti-patterns auditx catches
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--color-accent)',
              letterSpacing: '0.08em',
            }}>
              aipatterns.ts
            </div>
          </div>

          {/* Lines */}
          <div className="scroll-x" style={{ padding: '16px 20px' }}>
            <div style={{ minWidth: 'max-content' }}>
              {CODE_LINES.map((line) => (
                <div
                  key={line.name}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    lineHeight: 2.2,
                    display: 'flex',
                    gap: 16,
                  }}
                >
                  <span style={{ color: line.sevColor, minWidth: 44, fontWeight: 700 }}>{line.sev}</span>
                  <span style={{ color: 'var(--color-mute)', minWidth: 210 }}>{line.name}</span>
                  <span style={{ color: 'var(--color-ink-light)' }}>{line.code}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
