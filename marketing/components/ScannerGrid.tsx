'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScrollReveal from './ScrollReveal';

const CATEGORIES = [
  {
    id: 'security',
    label: 'Security & Vulnerabilities',
    desc: 'Critical security flaws, CVEs, and secret leaks',
    accentColor: 'var(--color-danger)',
    count: 4,
    scanners: [
      { id: 'SECRETS',  tool: 'Gitleaks',      desc: 'API keys, tokens, passwords — including git history', tag: 'SECRETS' },
      { id: 'DEPS',     tool: 'Trivy + npm audit', desc: 'CVEs in npm/pip/cargo with CVSS scores', tag: 'DEPS' },
      { id: 'SAST',     tool: 'Semgrep',        desc: 'SQL injection, eval, XSS, command injection, path traversal', tag: 'SAST' },
      { id: 'IAC',      tool: 'Trivy config',   desc: 'Dockerfile misconfig, k8s insecure defaults, Terraform', tag: 'IAC', unique: true },
    ],
  },
  {
    id: 'quality',
    label: 'Code Quality',
    desc: 'Bugs, complexity, and maintainability',
    accentColor: 'var(--color-ok)',
    count: 6,
    scanners: [
      { id: 'LINT',     tool: 'ESLint',         desc: 'Security-focused lint rules — no-eval, no-implied-eval, no-new-func', tag: 'LINT' },
      { id: 'DEAD',     tool: 'Knip',            desc: 'Unused exports, dead files, zombie dependencies', tag: 'DEAD', unique: true },
      { id: 'DUPE',     tool: 'jscpd',           desc: 'Copy-paste detection with configurable threshold', tag: 'DUPE' },
      { id: 'COMPLEX',  tool: 'Lizard',          desc: 'Cyclomatic complexity, function length, nesting depth', tag: 'COMPLEX' },
      { id: 'SPELL',    tool: 'CSpell',          desc: 'Typos in identifiers, comments, and string literals', tag: 'SPELL', unique: true },
      { id: 'SHELL',    tool: 'ShellCheck',      desc: 'Shell script bugs, portability, and best practices', tag: 'SHELL', unique: true },
    ],
  },
  {
    id: 'ai',
    label: 'AI Anti-Patterns',
    desc: 'Subtle bugs commonly introduced by LLM coding agents',
    accentColor: 'var(--color-accent)',
    count: 1,
    scanners: [
      { id: 'AI',       tool: 'aipatterns',      desc: '100+ custom rules: floating promises, ts-any-cast, silent catch, state mutation, and more', tag: 'AI_CODE', unique: true },
    ],
  },
  {
    id: 'health',
    label: 'Project Health',
    desc: 'Licensing, churn, and type safety',
    accentColor: 'var(--color-warn)',
    count: 4,
    scanners: [
      { id: 'LICENSE',  tool: 'Trivy license',   desc: 'GPL contamination, AGPL, SSPL — flag risky licenses', tag: 'LICENSE' },
      { id: 'TYPES',    tool: 'TypeScript (tsc)', desc: 'Type errors, strict mode violations, inference gaps', tag: 'TYPES' },
      { id: 'CHURN',    tool: 'git log analysis', desc: 'High-churn files correlate with bugs — flag 3+ changes/week', tag: 'CHURN', unique: true },
      { id: 'SIZE',     tool: 'bundle analysis',  desc: 'Oversized dependencies and duplicated npm packages', tag: 'SIZE' },
    ],
  },
];

export default function ScannerGrid() {
  const [openId, setOpenId] = useState<string>('security');

  return (
    <section id="scanners" className="page-section">
      <ScrollReveal>
        <div style={{ marginBottom: 40 }}>
          <h2 style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'clamp(24px, 3vw, 36px)',
            fontWeight: 800,
            letterSpacing: '-0.8px',
            color: 'var(--color-ink)',
            lineHeight: 1.2,
          }}>
            Grouped by domain. Every applicable scanner<br />runs automatically.
          </h2>
        </div>
      </ScrollReveal>

      <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--color-hairline)' }}>
        {CATEGORIES.map((cat, catIdx) => {
          const isOpen = openId === cat.id;
          return (
            <ScrollReveal key={cat.id} delay={catIdx * 60}>
              <div style={{ borderBottom: catIdx < CATEGORIES.length - 1 ? '1px solid var(--color-hairline)' : 'none' }}>

                {/* Category row */}
                <button
                  onClick={() => setOpenId(isOpen ? '' : cat.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '20px 24px',
                    backgroundColor: isOpen ? 'var(--color-surface)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background-color 0.2s ease',
                  }}
                >
                  {/* Accent dot */}
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: cat.accentColor,
                    flexShrink: 0,
                    opacity: isOpen ? 1 : 0.5,
                  }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: 'var(--font-sans)',
                      fontWeight: 700,
                      fontSize: 16,
                      color: 'var(--color-ink)',
                      marginBottom: 3,
                    }}>
                      {cat.label}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 13,
                      color: 'var(--color-mute)',
                    }}>
                      {cat.desc} · {cat.count} scanner{cat.count > 1 ? 's' : ''}
                    </div>
                  </div>

                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 18,
                    color: isOpen ? cat.accentColor : 'var(--color-mute)',
                    transition: 'color 0.2s',
                    flexShrink: 0,
                  }}>
                    {isOpen ? '−' : '+'}
                  </div>
                </button>

                {/* Scanner details */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="panel"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                        gap: 0,
                        borderTop: '1px solid var(--color-hairline)',
                        backgroundColor: 'var(--color-surface)',
                      }}>
                        {cat.scanners.map((s, si) => (
                          <div
                            key={s.id}
                            style={{
                              padding: '18px 24px',
                              borderRight: si % 3 < 2 ? '1px solid var(--color-hairline)' : 'none',
                              borderBottom: '1px solid var(--color-hairline)',
                            }}
                          >
                            {/* Tag + unique */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                              <span style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: 12,
                                fontWeight: 700,
                                letterSpacing: '0.1em',
                                color: cat.accentColor,
                                padding: '2px 6px',
                                border: `1px solid ${cat.accentColor}`,
                                opacity: 0.8,
                              }}>
                                {s.tag}
                              </span>
                              {'unique' in s && s.unique && (
                                <span style={{
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: 8,
                                  fontWeight: 600,
                                  letterSpacing: '0.08em',
                                  color: 'var(--color-accent)',
                                  padding: '2px 5px',
                                  border: '1px solid var(--color-accent)',
                                  opacity: 0.7,
                                }}>
                                  UNIQUE
                                </span>
                              )}
                            </div>
                            <div style={{
                              fontFamily: 'var(--font-sans)',
                              fontWeight: 700,
                              fontSize: 15,
                              color: 'var(--color-ink)',
                              marginBottom: 6,
                            }}>
                              {s.tool}
                            </div>
                            <div style={{
                              fontFamily: 'var(--font-sans)',
                              fontSize: 13,
                              lineHeight: 1.65,
                              color: 'var(--color-mute)',
                            }}>
                              {s.desc}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </ScrollReveal>
          );
        })}
      </div>
    </section>
  );
}
