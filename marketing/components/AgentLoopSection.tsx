'use client';
import { useState } from 'react';
import CopyButton from './CopyButton';
import ScrollReveal from './ScrollReveal';

// Syntax-highlighted JSON renderer
// Keys → cyan, strings → green, numbers → amber, booleans → the key visual
function JsonLine({ line }: { line: string }) {
  const highlighted = line
    // Keys: "foo":
    .replace(/"([^"]+)":/g, `<span style="color:#7dd3fc">"$1"</span>:`)
    // String values: : "foo"
    .replace(/: "([^"]+)"/g, `: <span style="color:#86efac">"$1"</span>`)
    // Boolean false (danger highlight)
    .replace(/: (false)\b/g, `: <span style="color:#f87171;font-weight:700">$1</span>`)
    // Boolean true
    .replace(/: (true)\b/g, `: <span style="color:#4ade80;font-weight:700">$1</span>`)
    // Numbers
    .replace(/: (\d+)\b/g, `: <span style="color:#fbbf24">$1</span>`);

  return <div dangerouslySetInnerHTML={{ __html: highlighted || '\u00A0' }} />;
}

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
      "msg": "Async call not awaited — no .catch attached",
      "fixable": false
    }
  ]
}`;

const STEPS = [
  {
    num: '01',
    label: 'Run in agent mode',
    detail: 'Pure JSON to stdout — no spinners, no ANSI color codes. Agent parses it directly.',
    code: 'result = shell("auditx . --output agent")\nreport = json.loads(result.stdout)',
  },
  {
    num: '02',
    label: 'Gate on ok flag',
    detail: 'ok: false means critical or high findings exist. The agent branches immediately — no string parsing.',
    code: 'if not report["ok"]:\n    # fix loop starts here',
  },
  {
    num: '03',
    label: 'Iterate by file',
    detail: 'Agent gets a file → findings map. Sends each file with context to the LLM for patching.',
    code: 'for file in report["files"]:\n    findings = get_findings(file)\n    apply_llm_patch(file, findings)',
  },
  {
    num: '04',
    label: 'Re-run to verify',
    detail: 'After patches are applied, agent re-runs auditx. Loop until ok: true.',
    code: 'while not report["ok"]:\n    fix_and_rerun()\n# ✓ clean',
  },
];

export default function AgentLoopSection() {
  const [copied, setCopied] = useState(false);

  return (
    <section id="agent" style={{ paddingTop: 96 }}>
      {/* Section divider so it doesn't slam into dark */}
      <div style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: '0 24px',
        borderTop: '1px solid rgba(0,0,0,0.09)',
        marginBottom: 0,
      }} />

      <div style={{ backgroundColor: '#111111' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '64px 24px 72px' }}>

          <ScrollReveal>
            {/* Eyebrow tag */}
            <div style={{
              display: 'inline-block',
              fontFamily: 'inherit',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
              padding: '3px 10px',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#737373',
              marginBottom: 20,
              textTransform: 'uppercase',
            }}>
              For AI agent loops
            </div>

            <h2 style={{
              fontFamily: 'inherit',
              fontWeight: 700,
              fontSize: 'clamp(24px, 3.5vw, 36px)',
              letterSpacing: '-0.5px',
              color: '#fafaf9',
              margin: '0 0 16px',
            }}>
              Built for the agentic-coding era
            </h2>

            <p style={{
              fontFamily: 'inherit',
              fontSize: 16,
              lineHeight: 1.75,
              color: '#9a9898',
              maxWidth: 540,
              marginBottom: 40,
            }}>
              Claude Code, Cursor, Codex — agents that write code need a trust layer.{' '}
              <code style={{ color: '#fafaf9', fontFamily: 'inherit' }}>--output agent</code> produces a
              single-line JSON payload: stable fingerprints, file→finding maps, fixability flags,
              and a boolean <code style={{ color: '#f87171', fontFamily: 'inherit' }}>ok</code> gate.
            </p>
          </ScrollReveal>

          {/* JSON block with syntax highlighting */}
          <ScrollReveal delay={80}>
            <div style={{
              border: '1px solid rgba(255,255,255,0.08)',
              marginBottom: 48,
              overflow: 'hidden',
            }}>
              {/* Block header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                backgroundColor: '#1a1a1a',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                gap: 8,
                flexWrap: 'wrap',
              }}>
                <span style={{ fontFamily: 'inherit', fontSize: 12, color: '#737373' }}>
                  $ auditx . --output agent | python3 -m json.tool
                </span>
                <CopyButton code="auditx . --output agent" />
              </div>

              {/* ok: false callout — the key marketing point */}
              <div style={{
                padding: '10px 16px',
                backgroundColor: 'rgba(239,68,68,0.08)',
                borderBottom: '1px solid rgba(239,68,68,0.15)',
                fontFamily: 'inherit',
                fontSize: 13,
                color: '#f87171',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <span style={{ fontWeight: 700 }}>ok: false</span>
                <span style={{ color: '#737373' }}>—</span>
                <span style={{ color: '#9a9898' }}>1 critical · 2 high findings. Agent branches to fix loop.</span>
              </div>

              {/* Highlighted JSON */}
              <div className="scroll-x" style={{ padding: '16px 20px', overflowX: 'auto', backgroundColor: '#0d0d0d' }}>
                <pre style={{
                  fontFamily: 'inherit',
                  fontSize: 13,
                  lineHeight: 1.85,
                  margin: 0,
                  whiteSpace: 'pre',
                  minWidth: 'max-content',
                }}>
                  {AGENT_JSON.split('\n').map((line, i) => (
                    <JsonLine key={i} line={line} />
                  ))}
                </pre>
              </div>
            </div>
          </ScrollReveal>

          {/* Agent loop steps */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{
              fontFamily: 'inherit',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#737373',
              padding: '12px 0',
            }}>
              The agent loop
            </div>
          </div>

          <div className="agent-grid">
            {STEPS.map((step, i) => (
              <ScrollReveal key={step.num} delay={i * 70}>
                <div style={{ padding: '20px', borderLeft: i % 2 === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{
                    fontFamily: 'inherit',
                    fontWeight: 700,
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    color: '#4ade80',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                  }}>
                    step {step.num}
                  </div>
                  <div style={{ fontFamily: 'inherit', fontWeight: 700, fontSize: 16, color: '#fafaf9', marginBottom: 8 }}>
                    {step.label}
                  </div>
                  <p style={{ fontFamily: 'inherit', fontSize: 14, lineHeight: 1.7, color: '#9a9898', marginBottom: 14 }}>
                    {step.detail}
                  </p>
                  <pre
                    className="scroll-x"
                    style={{
                      fontFamily: 'inherit',
                      fontSize: 12,
                      padding: '12px 14px',
                      backgroundColor: '#0d0d0d',
                      color: '#4ade80',
                      lineHeight: 1.8,
                      margin: 0,
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
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
