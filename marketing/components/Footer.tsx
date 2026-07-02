'use client';
import CopyButton from './CopyButton';

const HR   = '1px solid rgba(0,0,0,0.09)';
const INK  = '#1a1a1a';
const MUTE = '#737373';
const ASH  = '#a3a3a3';

const LINKS = [
  { label: 'GitHub',          href: 'https://github.com/parth308/auditx' },
  { label: 'npm',             href: 'https://www.npmjs.com/package/auditx' },
  { label: 'Issues',          href: 'https://github.com/parth308/auditx/issues' },
  { label: 'MIT License',     href: 'https://github.com/parth308/auditx/blob/main/LICENSE' },
  { label: 'README',          href: 'https://github.com/parth308/auditx#readme' },
  { label: 'parthmongia.dev', href: 'https://parthmongia.dev' },
];

export default function Footer() {
  return (
    <footer style={{ marginTop: 80 }}>
      {/* CTA strip */}
      <div style={{
        borderTop: '2px solid #1a1a1a',
        backgroundColor: '#f5f4f2',
      }}>
        <div style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: '40px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
        }}>
          <div>
            <div style={{
              fontFamily: 'inherit',
              fontWeight: 700,
              fontSize: 'clamp(20px, 2.5vw, 26px)',
              letterSpacing: '-0.3px',
              color: INK,
              marginBottom: 6,
            }}>
              Start auditing in 30 seconds.
            </div>
            <div style={{ fontFamily: 'inherit', fontSize: 15, color: MUTE }}>
              Zero config. 13 scanners. MIT — free forever.
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 18px',
            backgroundColor: '#1a1a1a',
            flexShrink: 0,
          }}>
            <code style={{ fontFamily: 'inherit', fontSize: 14, color: '#fafaf9' }}>
              npx auditx@latest .
            </code>
            <CopyButton code="npx auditx@latest ." />
          </div>
        </div>
      </div>

      {/* Link row */}
      <div style={{ borderTop: HR, borderBottom: HR }}>
        <div style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          flexWrap: 'wrap',
        }}>
          {LINKS.map((link, i) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: link.label === 'parthmongia.dev' ? 600 : 400,
                padding: '14px 20px',
                color: link.label === 'parthmongia.dev' ? INK : MUTE,
                borderRight: i < LINKS.length - 1 ? HR : 'none',
                transition: 'color 0.15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = INK)}
              onMouseLeave={e => (e.currentTarget.style.color = link.label === 'parthmongia.dev' ? INK : MUTE)}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>

      {/* Copyright */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '16px 24px 48px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}>
          <span style={{ fontFamily: 'inherit', fontSize: 12, color: ASH }}>
            © 2026 auditx · MIT License · by{' '}
            <a
              href="https://parthmongia.dev"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: MUTE, textDecoration: 'underline', textUnderlineOffset: 2 }}
            >
              Parth Mongia
            </a>
          </span>
          <span style={{ fontFamily: 'inherit', fontSize: 12, color: ASH }}>
            built with auditx · zero critical findings
          </span>
        </div>
      </div>
    </footer>
  );
}
