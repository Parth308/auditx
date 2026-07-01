import ScrollReveal from './ScrollReveal';

const HR = '1px solid rgba(15,0,0,0.12)';
const FONT = 'inherit';

const SEV: Record<string, string> = {
  critical: '#ff3b30',
  high:     '#ff9f0a',
  warning:  '#ff9f0a',
  medium:   '#007aff',
  low:      '#9a9898',
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
    <section id="scanners" style={{ maxWidth: 960, margin: '0 auto', padding: '96px 24px 0' }}>
      <ScrollReveal>
        <div style={{ borderBottom: HR, paddingBottom: 12, marginBottom: 0 }}>
          <div style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: '#201d1d' }}>
            [+] 13 scanner categories
          </div>
          <div style={{ fontFamily: FONT, fontSize: 14, marginTop: 6, color: '#646262' }}>
            Every applicable scanner runs. Nothing skipped unless you ask.
          </div>
        </div>
      </ScrollReveal>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        border: HR,
        borderTop: 'none',
      }}>
        {SCANNERS.map((s, i) => (
          <ScrollReveal key={s.id} delay={i * 40}>
            <div style={{
              padding: '16px',
              borderBottom: HR,
              borderRight: HR,
              backgroundColor: s.unique ? '#f8f7f7' : 'transparent',
              height: '100%',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: SEV[s.sev], letterSpacing: '0.05em' }}>
                  {s.id}
                </span>
                {s.unique && (
                  <span style={{
                    fontFamily: FONT, fontSize: 10, padding: '2px 6px', borderRadius: 4,
                    backgroundColor: '#201d1d', color: '#fdfcfc',
                  }}>
                    [unique]
                  </span>
                )}
              </div>
              <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: '#646262', marginBottom: 6 }}>
                {s.tool}
              </div>
              <p style={{ fontFamily: FONT, fontSize: 13, lineHeight: 1.6, color: '#424245', margin: 0 }}>
                {s.desc}
              </p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
