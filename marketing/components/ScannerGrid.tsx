import ScrollReveal from './ScrollReveal';

const INK  = '#1a1a1a';
const BODY = '#404040';
const MUTE = '#737373';
const HR   = '1px solid rgba(0,0,0,0.09)';

const SEV: Record<string, string> = {
  critical: '#dc2626',
  high:     '#d97706',
  warning:  '#d97706',
  medium:   '#2563eb',
  low:      '#737373',
};

const SCANNERS = [
  { id: 'SECRETS',     tool: 'Gitleaks',          desc: 'API keys, tokens, passwords — including git history', sev: 'critical' },
  { id: 'DEPS',        tool: 'Trivy + npm audit',  desc: 'CVEs in npm/pip/cargo with CVSS scores and fix versions', sev: 'high' },
  { id: 'SAST',        tool: 'Semgrep',            desc: 'SQL injection, eval, XSS, command injection, path traversal', sev: 'high' },
  { id: 'AI_CODE',     tool: 'Semgrep (44 rules)', desc: 'Silent catches, floating promises, ts-any-cast, React state mutation — AI anti-patterns only', sev: 'warning', unique: true },
  { id: 'DEAD_CODE',   tool: 'Knip',               desc: 'Unused exports, imports, and entire dependencies', sev: 'medium' },
  { id: 'PATTERNS',    tool: 'ESLint (security)',   desc: 'Prototype pollution, unsafe regex, insecure randomness', sev: 'medium' },
  { id: 'DUPLICATION', tool: 'jscpd',              desc: 'Copy-pasted code blocks (polyglot — not just JS)', sev: 'medium' },
  { id: 'COMPLEXITY',  tool: 'Lizard',             desc: 'Cyclomatic complexity — functions too complex to test safely', sev: 'medium' },
  { id: 'DEP_HEALTH',  tool: 'depcheck',           desc: 'Packages in package.json not used anywhere in code', sev: 'low' },
  { id: 'LICENSE',     tool: 'license-checker',    desc: 'GPL/AGPL licenses that create commercial legal risk', sev: 'high' },
  { id: 'TYPE_SAFETY', tool: 'tsc',                desc: 'TypeScript compilation errors and missing types', sev: 'high' },
  { id: 'GIT_HEALTH',  tool: 'git log',            desc: 'Hotspot analysis — files modified 50+ times = churn signal', sev: 'low' },
  { id: 'IaC',         tool: 'Trivy config',       desc: 'Dockerfile misconfig, k8s insecure defaults, Terraform issues', sev: 'high' },
];

export default function ScannerGrid() {
  return (
    <section id="scanners" className="page-section">
      <ScrollReveal>
        <div style={{ borderBottom: HR, paddingBottom: 12 }}>
          <div style={{ fontFamily: 'inherit', fontSize: 20, fontWeight: 700, color: INK }}>
            [+] 13 scanner categories
          </div>
          <div style={{ fontFamily: 'inherit', fontSize: 15, marginTop: 5, color: MUTE }}>
            Every applicable scanner runs. Nothing skipped unless you ask.
          </div>
        </div>
      </ScrollReveal>

      <div className="scanner-grid">
        {SCANNERS.map((s, i) => (
          <ScrollReveal key={s.id} delay={i * 40}>
            <div style={{ padding: '18px 16px', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{
                  fontFamily: 'inherit',
                  fontWeight: 700,
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  color: SEV[s.sev],
                }}>
                  {s.id}
                </span>
                {s.unique && (
                  <span style={{
                    fontFamily: 'inherit',
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    padding: '2px 6px',
                    backgroundColor: INK,
                    color: '#fafaf9',
                    whiteSpace: 'nowrap',
                  }}>
                    [unique]
                  </span>
                )}
              </div>
              <div style={{ fontFamily: 'inherit', fontWeight: 600, fontSize: 15, color: INK, marginBottom: 6 }}>
                {s.tool}
              </div>
              <p style={{ fontFamily: 'inherit', fontSize: 14, lineHeight: 1.65, color: BODY, margin: 0 }}>
                {s.desc}
              </p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
