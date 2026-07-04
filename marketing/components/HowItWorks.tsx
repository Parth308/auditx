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
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_center,_var(--color-accent)_0%,_transparent_70%)]"></div>
      
      <div className="flex flex-col items-center gap-4 w-full max-w-sm">
        {/* Source Files */}
        <div className="flex gap-2 w-full justify-center">
          {['package.json', 'Dockerfile', '.git', 'src/'].map((file, i) => (
            <motion.div
              key={file}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className="text-[10px] px-2 py-1 border border-[var(--color-hairline)] bg-[var(--color-surface)] text-[var(--color-mute)]"
            >
              {file}
            </motion.div>
          ))}
        </div>

        {/* Funnel */}
        <motion.div 
          initial={{ scaleY: 0 }} 
          animate={{ scaleY: 1 }} 
          className="h-8 w-px bg-[var(--color-accent)] origin-top opacity-50"
        />

        {/* Auditx Engine */}
        <motion.div
          animate={{ 
            boxShadow: ['0 0 0 0 rgba(74, 222, 128, 0)', '0 0 20px 2px rgba(74, 222, 128, 0.2)', '0 0 0 0 rgba(74, 222, 128, 0)']
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="px-6 py-2 border border-[var(--color-accent)] bg-[#09090b] text-[var(--color-accent)] font-bold text-sm tracking-widest uppercase z-10"
        >
          auditx detect
        </motion.div>

        <motion.div 
          initial={{ scaleY: 0 }} 
          animate={{ scaleY: 1 }} 
          className="h-8 w-px bg-[var(--color-accent)] origin-top opacity-50"
        />

        {/* Scanners Activated */}
        <div className="flex flex-wrap justify-center gap-2 w-full">
          {['npm audit', 'trivy', 'gitleaks', 'semgrep'].map((scanner, i) => (
            <motion.div
              key={scanner}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1 + (i * 0.1), duration: 0.3 }}
              className="text-[11px] px-3 py-1 border border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-ink)]"
            >
              {scanner}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OrchestratorAnimation() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const i = setInterval(() => {
      setActive(p => (p + 1) % 4);
    }, 2000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center p-6 bg-[var(--color-surface-2)] overflow-hidden" style={{ minHeight: '240px' }}>
      <div className="text-[10px] text-[var(--color-mute)] mb-4 uppercase tracking-widest w-full text-left">CPU Cores (4)</div>
      
      {/* CPU Cores */}
      <div className="flex gap-2 w-full mb-6">
        {[0, 1, 2, 3].map(core => (
          <div key={core} className="flex-1 h-12 border border-[var(--color-hairline)] bg-[var(--color-surface)] relative flex items-center justify-center overflow-hidden">
            <span className="text-[9px] text-[var(--color-mute)] opacity-50 absolute top-1 left-1">C{core}</span>
            {/* LPT Heavy Blocks */}
            <AnimatePresence mode="popLayout">
              {(active === 0 && core < 3) && (
                <motion.div
                  key={`heavy-${active}-${core}`}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  className="absolute inset-x-1 bottom-1 top-4 bg-[var(--color-warn)]/20 border border-[var(--color-warn)] flex items-center justify-center text-[10px] text-[var(--color-warn)] font-bold"
                >
                  {core === 1 ? 'SEMGREP (3)' : ''}
                </motion.div>
              )}
              {(active === 1 && (core === 0 || core === 1)) && (
                <motion.div
                  key={`med-${active}-${core}`}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  className="absolute inset-x-1 bottom-1 top-4 bg-[var(--color-accent)]/20 border border-[var(--color-accent)] flex items-center justify-center text-[10px] text-[var(--color-accent)] font-bold"
                >
                  {core === 0 ? 'TRIVY (2)' : ''}
                </motion.div>
              )}
              {(active > 1 || (active === 1 && core > 1) || (active === 0 && core === 3)) && (
                <motion.div
                  key={`light-${active}-${core}`}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  className="absolute inset-x-1 bottom-1 top-4 bg-[var(--color-ink)]/10 border border-[var(--color-hairline)] flex items-center justify-center text-[10px] text-[var(--color-ink)]"
                >
                  L
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
      
      <div className="text-[10px] text-[var(--color-mute)] mb-2 uppercase tracking-widest w-full text-left">Queue (LPT Sorted)</div>
      <div className="flex gap-1 w-full opacity-60">
        {[3, 3, 2, 1, 1, 1, 1].map((weight, i) => (
          <motion.div
            key={`q-${i}`}
            animate={{ x: active > 0 ? -10 : 0, opacity: active > 0 && i === 0 ? 0 : 1 }}
            className={`h-4 border flex items-center justify-center text-[8px]
              ${weight === 3 ? 'w-12 bg-[var(--color-warn)]/20 border-[var(--color-warn)] text-[var(--color-warn)]' : 
                weight === 2 ? 'w-8 bg-[var(--color-accent)]/20 border-[var(--color-accent)] text-[var(--color-accent)]' : 
                'w-4 bg-[var(--color-ink)]/10 border-[var(--color-hairline)] text-[var(--color-ink)]'}`}
          >
            {weight}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function NormalizeAnimation() {
  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center p-6 bg-[var(--color-surface-2)] overflow-hidden gap-6" style={{ minHeight: '240px' }}>
      <div className="flex gap-4 w-full justify-center">
        {['{sast}', '[deps]', '<iac>', '"lint"'].map((shape, i) => (
          <motion.div
            key={shape}
            animate={{ y: [0, 15, 0], opacity: [1, 0, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
            className="text-xs text-[var(--color-mute)] font-mono"
          >
            {shape}
          </motion.div>
        ))}
      </div>
      
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        className="w-12 h-12 border border-dashed border-[var(--color-accent)] rounded-full flex items-center justify-center"
      >
        <div className="w-8 h-8 border border-[var(--color-accent)] rounded-sm flex items-center justify-center bg-[var(--color-accent)]/10">
          <span className="text-[10px] text-[var(--color-accent)]">A</span>
        </div>
      </motion.div>
      
      <div className="w-full max-w-[200px] border border-[var(--color-accent)]/30 bg-[var(--color-surface)] p-2 text-[10px] font-mono text-[var(--color-ink)]">
        <span className="text-[var(--color-accent)]">"id":</span> "0x1A",<br/>
        <span className="text-[var(--color-accent)]">"sev":</span> "high",<br/>
        <span className="text-[var(--color-accent)]">"msg":</span> "Normalized"
      </div>
    </div>
  );
}

function OutputAnimation() {
  const modes = [
    { name: '--output terminal', icon: '💻', desc: 'Human' },
    { name: '--output markdown', icon: '📝', desc: 'PR' },
    { name: '--output json', icon: '📊', desc: 'CI' },
    { name: '--output agent', icon: '🤖', desc: 'AI' },
  ];
  
  return (
    <div className="relative h-full w-full flex items-center justify-center p-6 bg-[var(--color-surface-2)] overflow-hidden" style={{ minHeight: '240px' }}>
      <div className="grid grid-cols-2 gap-3 w-full">
        {modes.map((mode, i) => (
          <motion.div
            key={mode.name}
            whileHover={{ scale: 1.05, backgroundColor: 'var(--color-surface)' }}
            className="border border-[var(--color-hairline)] p-3 flex flex-col gap-2 cursor-pointer transition-colors bg-[var(--color-surface)]"
          >
            <div className="flex justify-between items-center">
              <span className="text-xl">{mode.icon}</span>
              <span className="text-[9px] uppercase tracking-widest text-[var(--color-mute)]">{mode.desc}</span>
            </div>
            <div className="text-[10px] text-[var(--color-accent)] font-mono">{mode.name}</div>
          </motion.div>
        ))}
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
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11, color: 'var(--color-mute)' }}>{s.num}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11, letterSpacing: '0.07em', color: 'var(--color-ink)' }}>{s.tag}</span>
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
            <div style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--color-mute)', textTransform: 'uppercase', marginBottom: 10 }}>
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
            <div style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--color-mute)', textTransform: 'uppercase', marginBottom: 10 }}>
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
