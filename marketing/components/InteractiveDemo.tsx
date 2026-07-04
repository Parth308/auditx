'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScrollReveal from './ScrollReveal';
import CopyButton from './CopyButton';

const SNIPPETS = [
  {
    id: 'secrets',
    label: 'Hardcoded Secret',
    language: 'typescript',
    code: `import { createClient } from '@supabase/supabase-js'

// Hardcoded API key — auditx flags this
const supabase = createClient(
  'https://xyz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret_key'
)

export async function fetchUsers() {
  const { data } = await supabase
    .from('users').select('*')
  return data
}`,
    findings: [
      {
        id: 'gitleaks/generic-api-key',
        title: 'Hardcoded API key',
        sev: 'CRITICAL',
        sevColor: 'var(--color-danger)',
        file: 'src/db.ts',
        line: 5,
        fix: 'Move to .env and use process.env.SUPABASE_KEY',
      },
    ],
  },
  {
    id: 'ai-patterns',
    label: 'AI Anti-Pattern',
    language: 'typescript',
    code: `async function processPayment(req, res) {
  const { amount } = req.body

  // Floating promise — AI-generated bug
  db.updateBalance(amount)

  // ts-any-cast — AI laziness
  const user = (await getUser(req.userId)) as any

  res.send({ status: 'ok', balance: user.balance })
}`,
    findings: [
      {
        id: 'ai-floating-promise',
        title: 'Floating promise',
        sev: 'MEDIUM',
        sevColor: 'var(--color-accent)',
        file: 'src/api.ts',
        line: 4,
        fix: 'await db.updateBalance(amount) or attach .catch()',
      },
      {
        id: 'ai-ts-any-cast',
        title: 'Type assertion to any',
        sev: 'MEDIUM',
        sevColor: 'var(--color-accent)',
        file: 'src/api.ts',
        line: 7,
        fix: 'Type the response properly instead of casting to any',
      },
    ],
  },
  {
    id: 'sast',
    label: 'Security Vuln',
    language: 'typescript',
    code: `import { exec } from 'child_process'
import express from 'express'
const app = express()

app.post('/ping', (req, res) => {
  const target = req.query.ip

  // Command injection — semgrep catches this
  exec(\`ping -c 4 \${target}\`, (err, stdout) => {
    if (err) return res.send(err)
    res.send(stdout)
  })
})`,
    findings: [
      {
        id: 'semgrep/command-injection',
        title: 'Command injection',
        sev: 'HIGH',
        sevColor: 'var(--color-warn)',
        file: 'src/server.ts',
        line: 8,
        fix: 'Use execFile() with a fixed binary and sanitized args',
      },
    ],
  },
];

const KEYWORDS = ['import', 'from', 'const', 'async', 'function', 'export', 'await', 'return', 'if'];

function highlight(code: string): string {
  return code
    .replace(
      new RegExp(`\\b(${KEYWORDS.join('|')})\\b`, 'g'),
      '<span style="color:var(--color-accent)">$1</span>'
    )
    .replace(
      /\/\/ (.*)/g,
      '<span style="color:var(--color-mute)">// $1</span>'
    )
    .replace(
      /'([^']+)'/g,
      "<span style='color:#fb923c'>'$1'</span>"
    )
    .replace(
      /`([^`]+)`/g,
      "<span style='color:#fb923c'>`$1`</span>"
    );
}

export default function InteractiveDemo() {
  const [active, setActive] = useState(SNIPPETS[0].id);
  const [scanning, setScanning] = useState(false);
  const snippet = SNIPPETS.find(s => s.id === active) || SNIPPETS[0];

  const handleSelect = (id: string) => {
    if (id === active) return;
    setScanning(true);
    setActive(id);
    setTimeout(() => setScanning(false), 500);
  };

  return (
    <section id="demo" className="page-section">
      <ScrollReveal>
        <div style={{ marginBottom: 36 }}>
          <h2 style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'clamp(24px, 3vw, 36px)',
            fontWeight: 800,
            letterSpacing: '-0.8px',
            color: 'var(--color-ink)',
            lineHeight: 1.2,
          }}>
            See what auditx catches — locally, in seconds.
          </h2>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={80}>
        <style>{`
          @media (max-width: 768px) {
            #demo .demo-split {
              flex-direction: column !important;
            }
            #demo .demo-editor {
              border-right: none !important;
              border-bottom: 1px solid var(--color-hairline) !important;
            }
          }
        `}</style>

        <div style={{
          border: '1px solid var(--color-hairline)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Tab bar */}
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--color-surface-2)',
            borderBottom: '1px solid var(--color-hairline)',
            overflowX: 'auto',
          }}>
            {/* TTY block */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 16px',
              borderRight: '1px solid var(--color-hairline)',
              height: '100%',
              flexShrink: 0,
              backgroundColor: 'var(--color-canvas)',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-mute)', fontWeight: 700 }}>[ TTY ]</span>
            </div>

            {SNIPPETS.map(s => (
              <button
                key={s.id}
                onClick={() => handleSelect(s.id)}
                style={{
                  padding: '10px 18px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                  border: 'none',
                  borderRight: '1px solid var(--color-hairline)',
                  borderBottom: active === s.id ? '2px solid var(--color-accent)' : '2px solid transparent',
                  cursor: 'pointer',
                  backgroundColor: active === s.id ? 'var(--color-surface)' : 'transparent',
                  color: active === s.id ? 'var(--color-ink)' : 'var(--color-mute)',
                  transition: 'color 0.15s, background-color 0.15s',
                  fontWeight: active === s.id ? 600 : 400,
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Editor + Output split */}
          <div className="demo-split" style={{
            display: 'flex',
            flexDirection: 'row',
            minHeight: 320,
          }}>
            {/* Code editor panel */}
            <div className="demo-editor" style={{
              flex: '1 1 55%',
              borderRight: '1px solid var(--color-hairline)',
              backgroundColor: '#0d0d14',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}>
              {/* Editor title bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 16px',
                borderBottom: '1px solid var(--color-hairline)',
                backgroundColor: 'var(--color-surface)',
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--color-mute)',
                }}>
                  example.ts
                </span>
                <CopyButton code={snippet.code} />
              </div>

              {/* Code */}
              <div style={{ flex: 1, overflow: 'auto', padding: '16px 0', display: 'flex' }}>
                {/* Line numbers */}
                <div style={{
                  width: 40,
                  flexShrink: 0,
                  textAlign: 'right',
                  padding: '0 10px 0 16px',
                  userSelect: 'none',
                }}>
                  {snippet.code.split('\n').map((_, i) => (
                    <div key={i} style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      lineHeight: '1.85em',
                      color: 'var(--color-ash)',
                    }}>
                      {i + 1}
                    </div>
                  ))}
                </div>
                {/* Code content */}
                <pre style={{
                  flex: 1,
                  margin: 0,
                  padding: '0 16px 0 0',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  lineHeight: '1.85em',
                  color: 'var(--color-ink-light)',
                  overflow: 'auto',
                  whiteSpace: 'pre',
                }}
                  dangerouslySetInnerHTML={{ __html: highlight(snippet.code) }}
                />
              </div>
            </div>

            {/* Terminal output panel */}
            <div style={{
              flex: '1 1 45%',
              backgroundColor: '#090910',
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
            }}>
              {/* Terminal title bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 16px',
                borderBottom: '1px solid var(--color-hairline)',
                backgroundColor: 'var(--color-surface)',
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--color-mute)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}>
                  terminal
                </span>
                {scanning && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                    style={{
                      width: 10,
                      height: 10,
                      border: '2px solid var(--color-accent)',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                    }}
                  />
                )}
              </div>

              {/* Output */}
              <div style={{ flex: 1, padding: '16px', overflow: 'auto', fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.8 }}>
                <AnimatePresence mode="wait">
                  {scanning ? (
                    <motion.div
                      key="scanning"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{ color: 'var(--color-mute)' }}
                    >
                      <div>$ auditx .</div>
                      <div style={{ marginTop: 8 }}>Scanning...</div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="results"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                    >
                      <div style={{ color: 'var(--color-mute)' }}>$ auditx .</div>
                      {snippet.findings.map(f => (
                        <div key={f.id} style={{
                          borderLeft: `2px solid ${f.sevColor}`,
                          paddingLeft: 12,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 12,
                              fontWeight: 700,
                              color: f.sevColor,
                              padding: '1px 6px',
                              border: `1px solid ${f.sevColor}`,
                            }}>
                              {f.sev}
                            </span>
                            <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>{f.title}</span>
                          </div>
                          <div style={{ color: 'var(--color-mute)', fontSize: 12 }}>
                            {f.file}:{f.line} · {f.id}
                          </div>
                          <div style={{ color: 'var(--color-ok)', fontSize: 12 }}>
                            fix: {f.fix}
                          </div>
                        </div>
                      ))}
                      <div style={{ color: 'var(--color-warn)', marginTop: 4 }}>
                        {snippet.findings.length} finding{snippet.findings.length > 1 ? 's' : ''} require attention.
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
