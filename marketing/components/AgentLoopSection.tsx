import ScrollReveal from './ScrollReveal';
import CopyButton from './CopyButton';

const FONT = 'inherit';
const HR_DARK = '1px solid rgba(255,255,255,0.07)';

const AGENT_JSON = `{
  "ok": false,
  "exitCode": 1,
  "counts": { "critical": 1, "high": 2, "medium": 5 },
  "files": ["src/config/db.ts", "src/api/client.ts"],
  "findings": [
    {
      "id": "gitleaks-001",
      "fp": "a3f91bc4d2e1",
      "sev": "critical",
      "cat": "SECRETS",
      "file": "src/config/db.ts",
      "line": 14,
      "msg": "Hardcoded API key in source file",
      "fix": "Move to .env · Rotate the key",
      "fixable": true
    },
    {
      "id": "aipatterns-003",
      "fp": "b8c22de9",
      "sev": "medium",
      "cat": "AI_CODE",
      "rule": "ai-floating-promise",
      "file": "src/api/client.ts",
      "line": 82,
      "msg": "Async call not awaited and no .catch attached",
      "fixable": false
    }
  ]
}`;

const STEPS = [
  {
    num: '01',
    label: 'Run in agent mode',
    detail: 'Pure JSON stdout — no spinners, no color codes. Agent parses it directly.',
    code: 'result = shell("auditx . --output agent")\nreport = json.loads(result.stdout)',
  },
  {
    num: '02',
    label: 'Check ok flag',
    detail: 'ok is false if critical or high findings exist. Branch immediately.',
    code: 'if not report["ok"]:\n    # fix loop starts',
  },
  {
    num: '03',
    label: 'Iterate by file',
    detail: 'Agent gets a file → finding-ids map. Sends each file + context to LLM.',
    code: 'for file in report["files"]:\n    findings = get_findings(file)\n    apply_llm_patch(file, findings)',
  },
  {
    num: '04',
    label: 'Re-run to verify',
    detail: 'After applying fixes, agent re-runs. Loop until ok: true.',
    code: '# Loop until clean:\nwhile not report["ok"]:\n    fix_and_rerun()',
  },
];

export default function AgentLoopSection() {
  return (
    <section id="agent" style={{ paddingTop: 96 }}>
      {/* Single full-bleed dark surface — one per page per design.md */}
      <div style={{ backgroundColor: '#201d1d' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '72px 24px 80px' }}>

          <ScrollReveal>
            <div style={{ marginBottom: 8 }}>
              <span style={{
                fontFamily: FONT, fontSize: 11, padding: '3px 10px', borderRadius: 4,
                backgroundColor: '#302c2c', color: '#9a9898',
              }}>
                [infrastructure for the agentic-coding era]
              </span>
            </div>
            <h2 style={{
              fontFamily: FONT, fontWeight: 700,
              fontSize: 'clamp(22px, 3vw, 30px)',
              color: '#fdfcfc', marginBottom: 14, marginTop: 16,
            }}>
              auditx as an AI agent tool node
            </h2>
            <p style={{
              fontFamily: FONT, fontSize: 15, lineHeight: 1.7,
              color: '#9a9898', maxWidth: 580, marginBottom: 40,
            }}>
              Claude Code, Cursor, Codex — AI agents that write code need a trust layer.{' '}
              <code style={{ color: '#fdfcfc' }}>--output agent</code> produces a single-line
              JSON payload built for machine consumption: stable fingerprints,
              file → finding maps, fixability flags, and a clean boolean{' '}
              <code style={{ color: '#fdfcfc' }}>ok</code> gate.
            </p>
          </ScrollReveal>

          {/* Agent JSON */}
          <ScrollReveal delay={80}>
            <div style={{
              borderRadius: 4, padding: '16px 20px', marginBottom: 40,
              backgroundColor: '#302c2c', border: '1px solid rgba(255,255,255,0.06)',
              overflowX: 'auto',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 12, fontFamily: FONT, fontSize: 12, color: '#9a9898',
              }}>
                <span>$ auditx . --output agent | python3 -m json.tool</span>
                <CopyButton code="auditx . --output agent" />
              </div>
              <pre style={{
                fontFamily: FONT, fontSize: 12, lineHeight: 1.8,
                color: '#fdfcfc', margin: 0, whiteSpace: 'pre-wrap',
              }}>
                {AGENT_JSON}
              </pre>
            </div>
          </ScrollReveal>

          {/* Loop steps */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          }}>
            {STEPS.map((step, i) => (
              <ScrollReveal key={step.num} delay={i * 70}>
                <div style={{
                  padding: '20px',
                  borderBottom: HR_DARK,
                  borderRight: i % 2 === 0 ? HR_DARK : 'none',
                }}>
                  <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 24, color: 'rgba(255,255,255,0.1)', marginBottom: 10 }}>
                    {step.num}
                  </div>
                  <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 14, color: '#fdfcfc', marginBottom: 6 }}>
                    {step.label}
                  </div>
                  <p style={{ fontFamily: FONT, fontSize: 13, lineHeight: 1.65, color: '#9a9898', marginBottom: 12 }}>
                    {step.detail}
                  </p>
                  <pre style={{
                    fontFamily: FONT, fontSize: 11, padding: '10px 12px',
                    borderRadius: 4, backgroundColor: '#201d1d', color: '#30d158',
                    lineHeight: 1.8, overflowX: 'auto',
                  }}>
                    {step.code}
                  </pre>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
