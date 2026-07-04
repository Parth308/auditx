'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CopyButton from './CopyButton';
import ScrollReveal from './ScrollReveal';

/* ── Data ─────────────────────────────────────────────────────── */
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
    }
  ]
}`;

const LOOP_STEPS = [
  {
    id: 'run',
    num: '01',
    label: 'RUN',
    color: 'var(--color-accent)',
    code: '$ auditx . --output agent',
    detail: 'Pure JSON stdout — no spinners, no ANSI. Agent parses directly.',
  },
  {
    id: 'parse',
    num: '02',
    label: 'PARSE',
    color: 'var(--color-warn)',
    code: '"ok": false → branch to fix',
    detail: 'Boolean ok gate. No string parsing. Agent branches immediately.',
  },
  {
    id: 'fix',
    num: '03',
    label: 'FIX',
    color: 'var(--color-ink-light)',
    code: 'apply_llm_patch(file, findings)',
    detail: 'Agent gets file→findings map. LLM patches each file with context.',
  },
  {
    id: 'verify',
    num: '04',
    label: 'VERIFY',
    color: 'var(--color-ok)',
    code: '"ok": true → loop exits',
    detail: 'Re-run auditx. Loop until ok: true. Stable fingerprints prevent churn.',
  },
];

/* ── JsonLine (syntax highlight) ──────────────────────────────── */
function JsonLine({ line }: { line: string }) {
  const html = line
    .replace(/"([^"]+)":/g, `<span style="color:var(--color-accent)">"$1"</span>:`)
    .replace(/: "([^"]+)"/g, `: <span style="color:var(--color-ok)">"$1"</span>`)
    .replace(/: (false)\b/g, `: <span style="color:var(--color-danger);font-weight:700">$1</span>`)
    .replace(/: (true)\b/g,  `: <span style="color:var(--color-ok);font-weight:700">$1</span>`)
    .replace(/: (\d+)\b/g,   `: <span style="color:var(--color-warn)">$1</span>`);
  return <div dangerouslySetInnerHTML={{ __html: html || '\u00A0' }} />;
}

/* ── Animated Loop Graphic ────────────────────────────────────── */
function AgentLoopGraphic() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep(s => (s + 1) % 4);
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  const step = LOOP_STEPS[activeStep];

  // SVG arrow paths between steps (top→right→bottom→left→top)
  const ARROWS = [
    { d: 'M 50 18 L 82 18', id: 'a1' },  // top → right
    { d: 'M 82 50 L 82 82', id: 'a2' },  // right → bottom
    { d: 'M 50 82 L 18 82', id: 'a3' },  // bottom → left
    { d: 'M 18 50 L 18 18', id: 'a4' },  // left → top
  ];

  const POSITIONS = [
    { x: '50%', y: '0%',   label: 'RUN',    transform: 'translate(-50%, 0)' },
    { x: '100%', y: '50%', label: 'PARSE',  transform: 'translate(-100%, -50%)' },
    { x: '50%', y: '100%', label: 'FIX',    transform: 'translate(-50%, -100%)' },
    { x: '0%',  y: '50%',  label: 'VERIFY', transform: 'translate(0, -50%)' },
  ];

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: 480,
      margin: '0 auto',
      aspectRatio: '1',
    }}>
      {/* Outer ring */}
      <svg
        viewBox="0 0 100 100"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          overflow: 'visible',
        }}
      >
        {/* Background circle */}
        <circle
          cx="50" cy="50" r="30"
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="0.5"
        />
        <circle
          cx="50" cy="50" r="38"
          fill="none"
          stroke="rgba(255,255,255,0.03)"
          strokeWidth="0.3"
          strokeDasharray="2 3"
        />

        {/* Animated flow ring */}
        <circle
          cx="50" cy="50" r="34"
          fill="none"
          stroke="var(--color-accent-dim)"
          strokeWidth="0.4"
          strokeDasharray="10 5"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 50 50"
            to="360 50 50"
            dur="8s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Connecting lines */}
        {[0,1,2,3].map(i => (
          <line
            key={i}
            x1={[50, 80, 50, 20][i]}
            y1={[20, 50, 80, 50][i]}
            x2={[80, 50, 20, 50][i]}
            y2={[50, 80, 50, 20][i]}
            stroke={activeStep === i ? 'rgba(234, 88, 12, 0.5)' : 'rgba(255,255,255,0.06)'}
            strokeWidth={activeStep === i ? '0.6' : '0.3'}
            strokeDasharray={activeStep === i ? 'none' : '1.5 2'}
            style={{ transition: 'stroke 0.3s' }}
          />
        ))}

        {/* Arrow heads */}
        <defs>
          <marker id="arrowCyan" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
            <polygon points="0 0, 4 2, 0 4" fill="rgba(234, 88, 12, 0.7)" />
          </marker>
          <marker id="arrowDim" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
            <polygon points="0 0, 4 2, 0 4" fill="rgba(255,255,255,0.12)" />
          </marker>
        </defs>

        {/* Step nodes */}
        {LOOP_STEPS.map((s, i) => {
          const isActive = i === activeStep;
          const cx = [50, 82, 50, 18][i];
          const cy = [18, 50, 82, 50][i];
          return (
            <g key={s.id}>
              {/* Outer glow on active */}
              {isActive && (
                <circle
                  cx={cx} cy={cy} r="8"
                  fill="none"
                  stroke={s.color}
                  strokeWidth="0.6"
                  opacity="0.4"
                >
                  <animate
                    attributeName="r"
                    from="8" to="11"
                    dur="0.8s"
                    repeatCount="indefinite"
                    calcMode="ease-in-out"
                  />
                  <animate
                    attributeName="opacity"
                    from="0.4" to="0"
                    dur="0.8s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
              {/* Node */}
              <circle
                cx={cx} cy={cy} r="6"
                fill={isActive ? s.color : '#1a1a24'}
                stroke={isActive ? s.color : 'rgba(255,255,255,0.1)'}
                strokeWidth={isActive ? '0' : '0.4'}
                style={{ transition: 'fill 0.4s, stroke 0.4s' }}
              />
              {/* Step num */}
              <text
                x={cx} y={cy}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="3.2"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="700"
                fill={isActive ? '#0a0a0f' : 'rgba(255,255,255,0.35)'}
                style={{ transition: 'fill 0.4s' }}
              >
                {s.num}
              </text>
              {/* Label outside */}
              <text
                x={[50, 90, 50, 10][i]}
                y={[10, 50, 90, 50][i]}
                textAnchor={(['middle', 'start', 'middle', 'end'] as const)[i]}
                dominantBaseline="middle"
                fontSize="3"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="700"
                letterSpacing="0.5"
                fill={isActive ? s.color : 'rgba(255,255,255,0.2)'}
                style={{ transition: 'fill 0.4s', textTransform: 'uppercase' }}
              >
                {s.label}
              </text>
            </g>
          );
        })}

        {/* Center badge */}
        <g>
          {/* Hex bg */}
          <polygon
            points="50,41 56,44.5 56,51.5 50,55 44,51.5 44,44.5"
            fill="#111117"
            stroke="rgba(234, 88, 12, 0.3)"
            strokeWidth="0.5"
          />
          <text
            x="50" y="47.5"
            textAnchor="middle"
            fontSize="2.8"
            fontFamily="JetBrains Mono, monospace"
            fontWeight="700"
            fill="var(--color-accent)"
            letterSpacing="0.3"
          >
            AGENT
          </text>
          <text
            x="50" y="51"
            textAnchor="middle"
            fontSize="2.4"
            fontFamily="JetBrains Mono, monospace"
            fontWeight="500"
            fill="rgba(255,255,255,0.3)"
          >
            LOOP
          </text>
        </g>
      </svg>

      {/* Active step code card — bottom center */}
      <div style={{
        position: 'absolute',
        bottom: -80,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(380px, 100%)',
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            style={{
              border: `1px solid ${step.color}`,
              backgroundColor: '#0d0d14',
              overflow: 'hidden',
            }}
          >
            {/* Card header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              backgroundColor: '#111117',
              borderBottom: `1px solid rgba(255,255,255,0.06)`,
            }}>
              <span style={{
                width: 6, height: 6,
                borderRadius: '50%',
                backgroundColor: step.color,
                flexShrink: 0,
              }} />
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: step.color,
                textTransform: 'uppercase',
              }}>
                {step.num} — {step.label}
              </span>
            </div>
            {/* Code line */}
            <div style={{
              padding: '10px 14px',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: '#f0f0f0',
              borderBottom: `1px solid rgba(255,255,255,0.04)`,
            }}>
              {step.code}
            </div>
            {/* Detail */}
            <div style={{
              padding: '8px 14px',
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              color: 'var(--color-mute)',
              lineHeight: 1.55,
            }}>
              {step.detail}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Main section ─────────────────────────────────────────────── */
export default function AgentLoopSection() {
  return (
    <section id="agent" className="page-section">
      <div style={{ border: '1px solid var(--color-hairline)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{
          padding: '32px 32px 28px',
          borderBottom: '1px solid var(--color-hairline)',
          background: 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-2) 100%)',
        }}>
          <ScrollReveal>
            <h2 style={{
              fontFamily: 'var(--font-sans)',
              fontWeight: 800,
              fontSize: 'clamp(24px, 3.5vw, 40px)',
              letterSpacing: '-1px',
              color: 'var(--color-ink)',
              marginBottom: 14,
              lineHeight: 1.15,
            }}>
              Built for the agentic-coding era.
            </h2>
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 16,
              lineHeight: 1.75,
              color: 'var(--color-ink-light)',
              maxWidth: 560,
            }}>
              Claude Code, Cursor, Codex — agents write code at scale.{' '}
              <code style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)', fontSize: 14 }}>
                --output agent
              </code>{' '}
              gives them a clean JSON contract: stable fingerprints,
              file-to-finding maps, fixability flags, and a boolean{' '}
              <code style={{ color: 'var(--color-danger)', fontFamily: 'var(--font-mono)', fontSize: 14 }}>ok</code>{' '}
              gate. Loop until clean.
            </p>
          </ScrollReveal>
        </div>

        {/* Two-column body: graphic + JSON */}
        <div className="agent-body-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
          alignItems: 'start',
        }}>

          {/* Left: Animated loop graphic */}
          <div style={{
            padding: '48px 32px 120px',
            borderRight: '1px solid var(--color-hairline)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(ellipse at 50% 40%, rgba(234, 88, 12, 0.04) 0%, transparent 70%)',
            minHeight: 480,
          }}>
            <ScrollReveal style={{ width: '100%' }}>
              <AgentLoopGraphic />
            </ScrollReveal>
          </div>

          {/* Right: JSON output */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Command bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 20px',
              backgroundColor: 'var(--color-surface-2)',
              borderBottom: '1px solid var(--color-hairline)',
              flexWrap: 'wrap',
              gap: 8,
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-mute)' }}>
                $ auditx . --output agent
              </span>
              <CopyButton code="auditx . --output agent" />
            </div>

            {/* ok: false callout */}
            <div style={{
              padding: '10px 20px',
              backgroundColor: 'rgba(244,63,94,0.07)',
              borderBottom: '1px solid rgba(244,63,94,0.15)',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <span style={{ fontWeight: 700, color: 'var(--color-danger)' }}>ok: false</span>
              <span style={{ color: 'var(--color-ash)' }}>—</span>
              <span style={{ color: 'var(--color-mute)', fontSize: 12 }}>1 critical · 2 high → agent branches</span>
            </div>

            {/* JSON body */}
            <div className="scroll-x" style={{ padding: '16px 20px', backgroundColor: '#090910', flex: 1 }}>
              <pre style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
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

            {/* Step summary */}
            <div style={{
              borderTop: '1px solid var(--color-hairline)',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
            }}>
              {LOOP_STEPS.map((s, i) => (
                <div key={s.id} style={{
                  padding: '14px 20px',
                  borderRight: i % 2 === 0 ? '1px solid var(--color-hairline)' : 'none',
                  borderBottom: i < 2 ? '1px solid var(--color-hairline)' : 'none',
                }}>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    color: s.color,
                    marginBottom: 5,
                    textTransform: 'uppercase',
                  }}>
                    {s.num} / {s.label}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    color: 'var(--color-mute)',
                    lineHeight: 1.5,
                  }}>
                    {s.code}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Responsive: stack on mobile */}
        <style>{`
          @media (max-width: 768px) {
            #agent .agent-body-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </section>
  );
}
