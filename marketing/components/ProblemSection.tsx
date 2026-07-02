import ScrollReveal from './ScrollReveal';

const INK  = '#1a1a1a';
const BODY = '#404040';
const MUTE = '#737373';
const HR   = '1px solid rgba(0,0,0,0.09)';

const C = '#1a1a1a';

const PROBLEMS = [
  { marker: '[+]', markerColor: '#16a34a', label: 'AI writes code in seconds', detail: 'Copilot, Cursor, Claude Code — your team ships 3× faster. That\'s the upside.' },
  { marker: '[-]', markerColor: '#dc2626', label: 'AI doesn\'t audit itself', detail: 'Silent catch blocks, floating promises, ts-any-cast, useEffect with no deps — these patterns ship constantly because no existing linter targets AI-generation anti-patterns specifically.' },
  { marker: '[-]', markerColor: '#dc2626', label: 'Manual toolchain is brutal', detail: 'Semgrep + Trivy + Gitleaks + ESLint + Knip = 5 CLIs, 5 JSON schemas, 5 update cycles, and still zero AI-pattern coverage.' },
  { marker: '[x]', markerColor: '#2563eb', label: 'auditx is the trust layer', detail: '44 custom Semgrep rules built from real AI codegen failure modes. One command, parallel execution, structured output that AI agents can parse and self-fix.' },
];

export default function ProblemSection() {
  return (
    <section style={{ maxWidth: 960, margin: '0 auto', padding: '96px 24px 0' }}>
      <ScrollReveal>
        <div style={{ borderBottom: HR, paddingBottom: 12, marginBottom: 0 }}>
          <span style={{ fontFamily: 'inherit', fontSize: 20, fontWeight: 700, color: C }}>
            [!] The problem with AI-assisted code
          </span>
        </div>
      </ScrollReveal>

      {PROBLEMS.map((p, i) => (
        <ScrollReveal key={p.label} delay={i * 70}>
          <div style={{ display: 'flex', gap: 18, padding: '22px 0', borderBottom: HR }}>
            <span style={{ fontFamily: 'inherit', fontWeight: 700, fontSize: 16, color: p.markerColor, flexShrink: 0, marginTop: 2 }}>
              {p.marker}
            </span>
            <div>
              <div style={{ fontFamily: 'inherit', fontWeight: 700, fontSize: 17, color: C, marginBottom: 6 }}>
                {p.label}
              </div>
              <div style={{ fontFamily: 'inherit', fontSize: 15, lineHeight: 1.7, color: BODY }}>
                {p.detail}
              </div>
            </div>
          </div>
        </ScrollReveal>
      ))}

      {/* Anti-pattern code callout */}
      <ScrollReveal delay={320}>
        <div className="scroll-x" style={{ marginTop: 32, backgroundColor: '#1a1a1a', padding: '24px 28px', overflowX: 'auto' }}>
          <div style={{ fontFamily: 'inherit', fontSize: 13, color: MUTE, marginBottom: 16 }}>
            // real AI-generated anti-patterns auditx catches
          </div>
          <div style={{ minWidth: 'max-content' }}>
            {[
              { sev: 'WARN',  sevColor: '#d97706', name: 'ai-silent-catch       ', code: "try { ... } catch (e) { }" },
              { sev: 'WARN',  sevColor: '#d97706', name: 'ai-floating-promise   ', code: "fetch(url)  // no await, no .catch" },
              { sev: 'WARN',  sevColor: '#d97706', name: 'ai-ts-any-cast        ', code: "const val = data as any" },
              { sev: 'ERROR', sevColor: '#dc2626', name: 'ai-react-state-mutate ', code: "state.items.push(newItem)" },
              { sev: 'WARN',  sevColor: '#d97706', name: 'ai-promise-in-loop    ', code: "for (const x of items) { await save(x) }" },
            ].map((line) => (
              <div key={line.name} style={{ fontFamily: 'inherit', fontSize: 13, lineHeight: 2.1, display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                <span style={{ color: line.sevColor, minWidth: 40 }}>{line.sev}</span>
                <span style={{ color: '#9a9898', minWidth: 200 }}>{line.name}</span>
                <span style={{ color: '#fafaf9' }}>{line.code}</span>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
