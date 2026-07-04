'use client';
import { motion, useAnimation, useInView, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import ScrollReveal from './ScrollReveal';

const HR = '1px solid var(--color-hairline)';

const STACKS = [
  'Node.js', 'TypeScript', 'Python', 'Go', 'Rust',
  'Docker', 'Terraform', 'React', 'Next.js',
  'NestJS', 'Express', 'Django', 'SQL', 'Prisma',
];

const FLAGS = [
  ['--watch', 'Re-run on file change'],
  ['--fix', 'Auto-apply fixable issues'],
  ['--skip secrets,sast', 'Skip categories'],
  ['--ci --severity high', 'Exit 1 for CI gates'],
  ['auditx hook install', 'Git hooks in one command'],
];

// ─── Animations ─────────────────────────────────────────────────────────────

function DetectAnimation() {
  return (
    <div className="relative h-full w-full flex items-center justify-center p-6 bg-[var(--color-surface-2)] overflow-hidden" style={{ minHeight: '240px' }}>
      <svg width="120" height="120" viewBox="0 0 120 120" className="overflow-visible">
        {/* Radar grid */}
        <circle cx="60" cy="60" r="50" fill="none" stroke="var(--color-hairline)" strokeWidth="1" />
        <circle cx="60" cy="60" r="30" fill="none" stroke="var(--color-hairline)" strokeWidth="1" strokeDasharray="2 4" />
        <line x1="10" y1="60" x2="110" y2="60" stroke="var(--color-hairline)" strokeWidth="1" />
        <line x1="60" y1="10" x2="60" y2="110" stroke="var(--color-hairline)" strokeWidth="1" />

        {/* Sweeping arm */}
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: 'center' }}
        >
          {/* Invisible bounding box circle to fix SVG transform-origin */}
          <circle cx="60" cy="60" r="60" fill="transparent" />
          <path d="M60 60 L60 10 A50 50 0 0 1 110 60 Z" fill="var(--color-accent-dim)" />
          <line x1="60" y1="60" x2="60" y2="10" stroke="var(--color-accent)" strokeWidth="2" />
        </motion.g>

        {/* Nodes (Found targets) */}
        {[
          { cx: 30, cy: 30, delay: 0 },
          { cx: 80, cy: 40, delay: 0.5 },
          { cx: 40, cy: 80, delay: 1.2 },
          { cx: 90, cy: 75, delay: 2.1 }
        ].map((node, i) => (
          <motion.g key={i} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 3, repeat: Infinity, delay: node.delay }}>
            <circle cx={node.cx} cy={node.cy} r="4" fill="var(--color-accent)" />
            <circle cx={node.cx} cy={node.cy} r="10" fill="none" stroke="var(--color-accent)" strokeWidth="1" />
          </motion.g>
        ))}
      </svg>
      <div className="absolute bottom-6 font-mono text-[12px] text-[var(--color-accent)] uppercase tracking-widest border border-[var(--color-accent)] px-2 py-1 bg-[var(--color-accent-dim)]">
        SCAN_ENGINE_INIT
      </div>
    </div>
  );
}

function OrchestratorAnimation() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const i = setInterval(() => {
      setActive(p => (p + 1) % 4);
    }, 2500);
    return () => clearInterval(i);
  }, []);

  const QUEUE_ITEMS = [
    { id: 'q1', w: 3 }, { id: 'q2', w: 3 }, { id: 'q3', w: 2 },
    { id: 'q4', w: 1 }, { id: 'q5', w: 1 }, { id: 'q6', w: 1 }, { id: 'q7', w: 1 }, { id: 'q8', w: 1 }
  ];

  let visibleQueue = QUEUE_ITEMS;
  if (active === 1) visibleQueue = QUEUE_ITEMS.slice(1);
  if (active === 2) visibleQueue = QUEUE_ITEMS.slice(2);
  if (active === 3) visibleQueue = QUEUE_ITEMS.slice(3);

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center p-6 bg-[var(--color-surface-2)] overflow-hidden" style={{ minHeight: '240px' }}>
      <div className="flex justify-between w-full mb-4">
        <div className="text-[12px] text-[var(--color-mute)] uppercase tracking-widest font-mono">CPU_CORES [4]</div>
        <div className="text-[12px] text-[var(--color-accent)] uppercase tracking-widest font-mono animate-pulse">ALLOCATING</div>
      </div>

      {/* CPU Cores (Vertical Servers) */}
      <div className="flex gap-2 w-full mb-6">
        {[0, 1, 2, 3].map(core => (
          <div key={core} className="flex-1 h-16 border border-[var(--color-hairline)] bg-[var(--color-canvas)] relative flex items-end justify-center overflow-hidden p-1">
            <span className="text-[12px] text-[var(--color-mute)] opacity-50 absolute top-1 left-1 font-mono">C{core}</span>
            {/* LPT Heavy Blocks */}
            <AnimatePresence mode="popLayout">
              {(active === 0 && core < 3) && (
                <motion.div
                  key={`heavy-${active}-${core}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: '80%', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="w-full bg-[var(--color-accent)]/20 border-t-2 border-[var(--color-accent)] flex items-center justify-center"
                >
                  <span className="text-[12px] text-[var(--color-accent)] font-bold font-mono rotate-[-90deg] whitespace-nowrap">
                    {core === 1 ? '3X' : '...'}
                  </span>
                </motion.div>
              )}
              {(active === 1 && (core === 0 || core === 1)) && (
                <motion.div
                  key={`med-${active}-${core}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: '60%', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="w-full bg-[var(--color-accent)]/10 border-t-2 border-[var(--color-accent)] flex items-center justify-center"
                >
                  <span className="text-[12px] text-[var(--color-accent)] font-bold font-mono rotate-[-90deg] whitespace-nowrap">
                    {core === 0 ? '2X' : '...'}
                  </span>
                </motion.div>
              )}
              {(active > 1 || (active === 1 && core > 1) || (active === 0 && core === 3)) && (
                <motion.div
                  key={`light-${active}-${core}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: '30%', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="w-full bg-[var(--color-surface-3)] border-t border-[var(--color-hairline)] flex items-center justify-center"
                >
                  <span className="text-[12px] text-[var(--color-mute)] font-bold font-mono">1X</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      <div className="text-[12px] text-[var(--color-mute)] mb-2 uppercase tracking-widest w-full text-left font-mono">LPT_QUEUE</div>
      <div className="flex gap-1 w-full overflow-hidden items-center h-6">
        <AnimatePresence mode="popLayout">
          {visibleQueue.map((item) => (
            <motion.div
              layout
              key={item.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className={`h-full border flex items-center justify-center text-[12px] font-mono shrink-0
                ${item.w === 3 ? 'w-10 bg-[var(--color-accent)]/20 border-[var(--color-accent)] text-[var(--color-accent)]' :
                  item.w === 2 ? 'w-8 bg-[var(--color-accent)]/10 border-[var(--color-accent)]/50 text-[var(--color-accent)]' :
                    'w-5 bg-[var(--color-surface-3)] border-[var(--color-hairline)] text-[var(--color-mute)]'}`}
            >
              {item.w}X
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function NormalizeAnimation() {
  return (
    <div className="relative h-full w-full flex items-center justify-center p-6 bg-[var(--color-surface-2)] overflow-hidden" style={{ minHeight: '240px' }}>
      <svg width="180" height="100" viewBox="0 0 180 100">
        {/* Filter core */}
        <polygon points="90,20 120,50 90,80 60,50" fill="var(--color-accent-dim)" stroke="var(--color-accent)" strokeWidth="2" />
        <line x1="90" y1="20" x2="90" y2="80" stroke="var(--color-accent)" strokeWidth="1" strokeDasharray="4 2" />
        <line x1="60" y1="50" x2="120" y2="50" stroke="var(--color-accent)" strokeWidth="1" strokeDasharray="4 2" />

        {/* Input streams (raw data) */}
        {[0, 1, 2].map(i => (
          <motion.g key={`in-${i}`} animate={{ x: [0, 40], opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.5 }}>
            <rect x="10" y={35 + i * 10} width="15" height="4" fill="var(--color-mute)" />
          </motion.g>
        ))}

        {/* Output stream (normalized) */}
        <motion.g animate={{ x: [0, 40], opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
          <rect x="130" y="48" width="30" height="4" fill="var(--color-accent)" />
        </motion.g>
      </svg>
      <div className="absolute bottom-6 font-mono text-[12px] text-[var(--color-ink)] uppercase tracking-widest border-t border-[var(--color-hairline)] pt-2 w-full text-center">
        DATA_SYNTHESIS
      </div>
    </div>
  );
}

function OutputAnimation() {
  const nodes = [
    { label: 'HUMAN', x: 20, y: 20 },
    { label: 'PR_AGENT', x: 120, y: 20 },
    { label: 'CI_GATE', x: 20, y: 80 },
    { label: 'AI_MODEL', x: 120, y: 80 },
  ];
  return (
    <div className="relative h-full w-full flex items-center justify-center p-6 bg-[var(--color-surface-2)] overflow-hidden" style={{ minHeight: '240px' }}>
      <svg width="200" height="120" viewBox="0 0 200 120">
        {/* Central Dispatch Hub */}
        <circle cx="100" cy="60" r="10" fill="var(--color-accent)" />
        <circle cx="100" cy="60" r="20" fill="none" stroke="var(--color-accent)" strokeWidth="1" strokeDasharray="2 2" />

        {/* Connecting lines */}
        {nodes.map((n, i) => (
          <g key={i}>
            <line x1="100" y1="60" x2={n.x + 30} y2={n.y + 10} stroke="var(--color-hairline)" strokeWidth="2" />
            {/* Signal pulse */}
            <motion.circle
              cx="100" cy="60" r="3" fill="var(--color-accent)"
              animate={{ cx: [100, n.x + 30], cy: [60, n.y + 10], opacity: [1, 0] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.25 }}
            />
            {/* Node Box */}
            <rect x={n.x} y={n.y} width="60" height="20" fill="var(--color-surface)" stroke="var(--color-hairline)" />
            <text x={n.x + 30} y={n.y + 14} fontSize="8" fontFamily="var(--font-mono)" fill="var(--color-mute)" textAnchor="middle">{n.label}</text>
          </g>
        ))}
      </svg>
      <div className="absolute bottom-6 font-mono text-[12px] text-[var(--color-ink)] uppercase tracking-widest w-full text-center">
        SIGNAL_DISPATCH
      </div>
    </div>
  );
}

const STEPS = [
  {
    num: '01',
    tag: 'DETECT',
    label: 'Stack auto-detected',
    detail: 'auditx walks your workspace 4 levels deep — finds package.json, pyproject.toml, go.mod, Dockerfile, *.tf, tsconfig.json, Prisma schemas. No config. No manifest. Only relevant scanners fire.',
    Visual: DetectAnimation,
  },
  {
    num: '02',
    tag: 'RUN',
    label: 'CPU-aware orchestration',
    detail: 'Each scanner has a cost weight (1–3). The LPT orchestrator fills CPU cores greedily — heavy scanners run alongside lightweight ones without hammering the machine, ensuring optimal CPU utilization.',
    Visual: OrchestratorAnimation,
  },
  {
    num: '03',
    tag: 'NORMALIZE',
    label: 'One schema, every scanner',
    detail: 'Five scanners, five different output formats. auditx normalizes everything into a single Finding schema with stable fingerprints — agents can deduplicate across re-runs without re-parsing 5 JSON shapes.',
    Visual: NormalizeAnimation,
  },
  {
    num: '04',
    tag: 'OUTPUT',
    label: 'Four modes, one flag',
    detail: 'Terminal for humans. Markdown for PR comments. JSON for CI dashboards. Agent mode is a single-line JSON optimized for context-window token efficiency.',
    Visual: OutputAnimation,
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="page-section">
      <ScrollReveal>
        <div style={{ borderBottom: HR, paddingBottom: 12, marginBottom: 0 }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 700, color: 'var(--color-ink)' }}>
            [+] System Architecture
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
              backgroundColor: 'var(--color-surface)',
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, color: 'var(--color-mute)' }}>{s.num}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, letterSpacing: '0.07em', color: 'var(--color-ink)' }}>{s.tag}</span>
          </div>
        ))}
      </div>

      {/* 2-col step grid */}
      <div className="grid-2col" style={{ borderTop: 'none' }}>
        {STEPS.map((step, i) => {
          const VisualComponent = step.Visual;
          return (
            <ScrollReveal key={step.num} delay={i * 80}>
              <div className="hover-lift" style={{
                height: '100%',
                backgroundColor: 'var(--color-canvas)',
                display: 'flex',
                flexDirection: 'column',
              }}>
                <div style={{ borderBottom: HR }}>
                  <VisualComponent />
                </div>
                <div style={{
                  padding: '24px 20px',
                  borderTop: `1px solid ${i === 0 ? 'var(--color-ink)' : i === 1 ? 'var(--color-warn)' : i === 2 ? 'var(--color-accent)' : 'var(--color-ok)'}`,
                  flex: 1
                }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 17, color: 'var(--color-ink)', marginBottom: 10 }}>
                    {step.label}
                  </div>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, lineHeight: 1.7, color: 'var(--color-ink-light)', margin: 0 }}>
                    {step.detail}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          );
        })}
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
            <div style={{ fontFamily: 'inherit', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--color-mute)', textTransform: 'uppercase', marginBottom: 10 }}>
              Also available
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {FLAGS.map(([flag, desc]) => (
                <div key={flag} style={{ fontFamily: 'inherit', fontSize: 14, color: 'var(--color-ink-light)' }}>
                  <code style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{flag}</code>
                  <span style={{ color: 'var(--color-mute)' }}>{' — '}{desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stacks */}
          <div style={{ padding: '20px' }}>
            <div style={{ fontFamily: 'inherit', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--color-mute)', textTransform: 'uppercase', marginBottom: 10 }}>
              Supported stacks
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {STACKS.map(s => (
                <span key={s} style={{
                  fontFamily: 'inherit',
                  fontSize: 12,
                  fontWeight: 500,
                  padding: '3px 9px',
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-hairline)',
                  color: 'var(--color-ink)',
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
