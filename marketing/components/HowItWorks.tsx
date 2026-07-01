import ScrollReveal from './ScrollReveal';

const C = '#201d1d';
const BODY = '#424245';
const HR = '1px solid rgba(15,0,0,0.12)';

const STEPS = [
  {
    num: '01',
    label: 'Install',
    detail: 'Zero config. No account. No cloud. External scanners auto-downloaded to ~/.auditx/bin on first run.',
    code: 'npm install -g auditx\n# or run directly:\nnpx auditx .',
  },
  {
    num: '02',
    label: 'Run',
    detail: '13 scanner categories execute in parallel. Stack auto-detected — only relevant scanners fire.',
    code: 'auditx .\n# target a specific path:\nauditx ./src',
  },
  {
    num: '03',
    label: 'Get the report',
    detail: 'Structured markdown, enriched JSON with fingerprints, terminal output, or agent-mode single-line JSON.',
    code: 'auditx . --output agent    # AI loops\nauditx . --output json     # CI/dashboards\nauditx . --output terminal # pretty print',
  },
  {
    num: '04',
    label: 'Fix or gate',
    detail: '--ci mode exits 1 on critical/high. Git hooks catch issues before they push. Auto-fix where possible.',
    code: 'auditx . --ci --severity high\nauditx hook install\nauditx . --fix',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="page-section">
      <ScrollReveal>
        <div style={{ borderBottom: HR, paddingBottom: 12, marginBottom: 0 }}>
          <span style={{ fontFamily: 'inherit', fontSize: 16, fontWeight: 700, color: C }}>
            [+] How it works
          </span>
        </div>
      </ScrollReveal>

      {/* CSS class handles 2-col → 1-col collapse */}
      <div className="grid-2col">
        {STEPS.map((step, i) => (
          <ScrollReveal key={step.num} delay={i * 80}>
            <div style={{ padding: '28px 20px', height: '100%' }}>
              <div style={{ fontFamily: 'inherit', fontWeight: 700, fontSize: 30, color: 'rgba(32,29,29,0.12)', marginBottom: 12 }}>
                {step.num}
              </div>
              <div style={{ fontFamily: 'inherit', fontWeight: 700, fontSize: 16, color: C, marginBottom: 8 }}>
                {step.label}
              </div>
              <p style={{ fontFamily: 'inherit', fontSize: 14, lineHeight: 1.65, color: BODY, marginBottom: 16 }}>
                {step.detail}
              </p>
              <pre
                className="scroll-x"
                style={{
                  fontFamily: 'inherit', fontSize: 12, padding: '12px 14px',
                  borderRadius: 4, backgroundColor: '#f1eeee', color: '#201d1d',
                  border: '1px solid rgba(15,0,0,0.08)', lineHeight: 1.8,
                }}
              >
                {step.code}
              </pre>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
