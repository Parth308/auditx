'use client';
import CopyButton from './CopyButton';

const HR  = '1px solid var(--color-hairline)';
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
    <footer style={{ marginTop: 96 }}>
      {/* CTA strip */}
      <div style={{
        borderTop: '1px solid var(--color-hairline)',
        backgroundColor: 'var(--color-surface)',
      }}>
        <div style={{
          maxWidth: 1400,
          margin: '0 auto',
          padding: '48px 28px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontWeight: 800,
              fontSize: 'clamp(22px, 2.8vw, 30px)',
              letterSpacing: '-0.5px',
              color: 'var(--color-ink)',
              marginBottom: 8,
              lineHeight: 1.15,
            }}>
              Start auditing in 30 seconds.
            </div>
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 15,
              color: 'var(--color-mute)',
            }}>
              Zero config. 15 scanners. MIT — free forever.
            </div>
          </div>

          {/* Command block */}
          <div style={{
            display: 'flex',
            alignItems: 'stretch',
            border: '1px solid var(--color-hairline)',
            backgroundColor: 'var(--color-surface-2)',
            flexShrink: 0,
          }}>
            <code style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 14,
              color: 'var(--color-accent)',
              padding: '12px 18px',
              borderRight: '1px solid var(--color-hairline)',
              display: 'flex',
              alignItems: 'center',
            }}>
              npx auditx@latest .
            </code>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <CopyButton code="npx auditx@latest ." />
            </div>
          </div>
        </div>
      </div>

      {/* Link row */}
      <div className="footer-links">
        {LINKS.map((link, i) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {link.label}
          </a>
        ))}
      </div>

      {/* Copyright */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '16px 28px 52px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-ash)' }}>
            © 2026 auditx · MIT License · by{' '}
            <a
              href="https://parthmongia.dev"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--color-mute)', textDecoration: 'underline', textUnderlineOffset: 3 }}
            >
              Parth Mongia
            </a>
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-ash)' }}>
            built with auditx · zero critical findings
          </span>
        </div>
      </div>
    </footer>
  );
}
