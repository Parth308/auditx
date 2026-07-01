import ScrollReveal from './ScrollReveal';

const C = '#201d1d';     // ink
const BODY = '#424245';  // body text
const MUTE = '#646262';  // muted
const HR = '1px solid rgba(15,0,0,0.12)';
const FONT = 'inherit';

const PROBLEMS = [
  { marker: '[+]', markerColor: '#30d158', label: 'AI writes code in seconds', detail: 'Copilot, Cursor, Claude Code — your team ships 3× faster. That\'s the upside.' },
  { marker: '[-]', markerColor: '#ff3b30', label: 'AI doesn\'t audit itself', detail: 'Silent catch blocks, floating promises, ts-any-cast, useEffect with no deps — these patterns ship constantly because no existing linter targets AI-generation anti-patterns specifically.' },
  { marker: '[-]', markerColor: '#ff3b30', label: 'Manual toolchain is brutal', detail: 'Semgrep + Trivy + Gitleaks + ESLint + Knip = 5 CLIs, 5 JSON schemas, 5 update cycles, and still zero AI-pattern coverage.' },
  { marker: '[x]', markerColor: '#007aff', label: 'auditx is the trust layer', detail: '44 custom Semgrep rules built from real AI codegen failure modes. One command, parallel execution, structured output that AI agents can parse and self-fix.' },
];

export default function ProblemSection() {
  return (
    <section style={{ maxWidth: 960, margin: '0 auto', padding: '96px 24px 0' }}>
      <ScrollReveal>
        <div style={{ borderBottom: HR, paddingBottom: 12, marginBottom: 0 }}>
          <span style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: C }}>
            [!] The problem with AI-assisted code
          </span>
        </div>
      </ScrollReveal>

      {PROBLEMS.map((p, i) => (
        <ScrollReveal key={p.label} delay={i * 70}>
          <div style={{ display: 'flex', gap: 16, padding: '18px 0', borderBottom: HR }}>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 14, color: p.markerColor, flexShrink: 0, marginTop: 2 }}>
              {p.marker}
            </span>
            <div>
              <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 16, color: C, marginBottom: 4 }}>
                {p.label}
              </div>
              <div style={{ fontFamily: FONT, fontSize: 14, lineHeight: 1.65, color: BODY }}>
                {p.detail}
              </div>
            </div>
          </div>
        </ScrollReveal>
      ))}

      {/* Anti-pattern code callout */}
      <ScrollReveal delay={320}>
        <div style={{ marginTop: 32, backgroundColor: '#201d1d', padding: '24px 28px', borderRadius: 0 }}>
          <div style={{ fontFamily: FONT, fontSize: 12, color: MUTE, marginBottom: 16 }}>
            // real AI-generated anti-patterns auditx catches
          </div>
          {[
            { sev: 'WARN',  sevColor: '#ff9f0a', name: 'ai-silent-catch       ', code: "try { ... } catch (e) { }" },
            { sev: 'WARN',  sevColor: '#ff9f0a', name: 'ai-floating-promise   ', code: "fetch(url)  // no await, no .catch" },
            { sev: 'WARN',  sevColor: '#ff9f0a', name: 'ai-ts-any-cast        ', code: "const val = data as any" },
            { sev: 'ERROR', sevColor: '#ff3b30', name: 'ai-react-state-mutate ', code: "state.items.push(newItem)" },
            { sev: 'WARN',  sevColor: '#ff9f0a', name: 'ai-promise-in-loop    ', code: "for (const x of items) { await save(x) }" },
          ].map((line) => (
            <div key={line.name} style={{ fontFamily: FONT, fontSize: 12, lineHeight: 2, display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
              <span style={{ color: line.sevColor, minWidth: 36 }}>{line.sev}</span>
              <span style={{ color: '#9a9898', minWidth: 190 }}>{line.name}</span>
              <span style={{ color: '#fdfcfc' }}>{line.code}</span>
            </div>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}
