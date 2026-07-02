import ScrollReveal from './ScrollReveal';

const INK  = '#1a1a1a';
const BODY = '#404040';
const MUTE = '#737373';
const OK   = '#16a34a';
const HR   = '1px solid rgba(0,0,0,0.09)';

const STEPS = [
  {
    num: '01',
    tag: 'DETECT',
    label: 'Stack auto-detected',
    detail: 'auditx walks your workspace 4 levels deep — finds package.json, pyproject.toml, go.mod, Dockerfile, *.tf, tsconfig.json, Prisma schemas. No config. No manifest. Only relevant scanners fire.',
    code: '$ auditx .\n\n  Stack detected: Node.js · TypeScript · Docker · SQL\n  Applicable scanners: 11 of 13',
  },
  {
    num: '02',
    tag: 'RUN',
    label: 'CPU-aware orchestration',
    detail: 'Each scanner has a cost weight (1–3). The orchestrator fills CPU cores greedily — heavy scanners (Semgrep cost=3, Trivy cost=3) run alongside lightweight ones (Gitleaks cost=1) without hammering the machine.',
    code: 'gitleaks  cost=1  ████░░░░ running\ntrivy     cost=3  ████████ running\nsemgrep   cost=3  ░░░░░░░░ queued\n\n// max_cost = os.cpus().length',
  },
  {
    num: '03',
    tag: 'NORMALIZE',
    label: 'One schema, every scanner',
    detail: 'Five scanners, five different output formats. auditx normalizes everything into a single Finding schema with stable fingerprints — agents can deduplicate across re-runs without re-parsing 5 JSON shapes.',
    code: '// unified across all scanners:\n{\n  id, fp, sev, cat,\n  file, line, rule,\n  msg, fix, fixable\n}',
  },
  {
    num: '04',
    tag: 'OUTPUT',
    label: 'Four modes, one flag',
    detail: 'Terminal for humans. Markdown for PR comments. JSON for dashboards. Agent mode is a single-line JSON with a boolean ok gate and file→finding maps — built for AI agent self-fix loops.',
    code: 'auditx . --output terminal   # human\nauditx . --output markdown   # PR\nauditx . --output json       # CI\nauditx . --output agent      # AI agents',
  },
];

const FLAGS = [
  ['--watch', 'Re-run on file change'],
  ['--fix', 'Auto-apply fixable issues'],
  ['--skip secrets,sast', 'Skip categories'],
  ['--ci --severity high', 'Exit 1 for CI gates'],
  ['auditx hook install', 'Git hooks in one command'],
];

const STACKS = [
  'Node.js', 'TypeScript', 'Python', 'Go', 'Rust',
  'Docker', 'Terraform', 'React', 'Next.js',
  'NestJS', 'Express', 'Django', 'SQL', 'Prisma',
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="page-section">
      <ScrollReveal>
        <div style={{ borderBottom: HR, paddingBottom: 12, marginBottom: 0 }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 700, color: INK }}>
            [+] How it works
          </span>
        </div>
      </ScrollReveal>

      {/* Step indicator strip */}
      <div style={{ display: 'flex', borderBottom: HR }}>
        {STEPS.map((s, i) => (
          <div
            key={s.num}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRight: i < STEPS.length - 1 ? HR : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: '#f5f4f2',
            }}
          >
            <span style={{ fontFamily: 'inherit', fontWeight: 700, fontSize: 11, color: MUTE }}>{s.num}</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 11, letterSpacing: '0.07em', color: INK }}>{s.tag}</span>
          </div>
        ))}
      </div>

      {/* 2-col step grid */}
      <div className="grid-2col">
        {STEPS.map((step, i) => (
          <ScrollReveal key={step.num} delay={i * 80}>
            <div className="hover-lift" style={{
              padding: '24px 20px',
              height: '100%',
              backgroundColor: '#fafaf9',
              borderLeft: `3px solid ${i === 0 ? '#1a1a1a' : i === 1 ? '#d97706' : i === 2 ? '#2563eb' : '#16a34a'}`,
            }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 17, color: INK, marginBottom: 10 }}>
                {step.label}
              </div>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, lineHeight: 1.7, color: BODY, marginBottom: 16 }}>
                {step.detail}
              </p>
              <pre
                className="scroll-x"
                style={{
                  fontFamily: 'inherit',
                  fontSize: 12,
                  padding: '12px 14px',
                  backgroundColor: '#141414',
                  color: '#d4d4d4',
                  lineHeight: 1.8,
                  margin: 0,
                  overflowX: 'auto',
                }}
              >
                {step.code}
              </pre>
            </div>
          </ScrollReveal>
        ))}
      </div>

      {/* Flags + stacks callout strip */}
      <ScrollReveal delay={200}>
        <div style={{
          borderTop: HR,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 0,
        }}>
          {/* Flags */}
          <div style={{ padding: '20px', borderRight: HR }}>
            <div style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: MUTE, textTransform: 'uppercase', marginBottom: 10 }}>
              Also available
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {FLAGS.map(([flag, desc]) => (
                <div key={flag} style={{ fontFamily: 'inherit', fontSize: 14, color: BODY }}>
                  <code style={{ color: OK, fontWeight: 600 }}>{flag}</code>
                  <span style={{ color: MUTE }}>{' — '}{desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stacks */}
          <div style={{ padding: '20px' }}>
            <div style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: MUTE, textTransform: 'uppercase', marginBottom: 10 }}>
              Supported stacks
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {STACKS.map(s => (
                <span key={s} style={{
                  fontFamily: 'inherit',
                  fontSize: 12,
                  fontWeight: 500,
                  padding: '3px 9px',
                  backgroundColor: '#f5f4f2',
                  border: '1px solid rgba(0,0,0,0.09)',
                  color: INK,
                }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
