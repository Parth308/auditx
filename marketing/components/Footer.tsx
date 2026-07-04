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
    <footer style={{ 
      marginTop: 120, 
      borderTop: '4px solid var(--color-accent)', 
      backgroundColor: 'var(--color-surface)', 
      position: 'relative', 
      overflow: 'hidden' 
    }}>
      {/* Massive Background Typography Watermark */}
      <div style={{
        position: 'absolute',
        top: 0, left: '50%',
        transform: 'translate(-50%, -20%)',
        fontSize: '22vw',
        fontWeight: 900,
        fontFamily: 'var(--font-sans)',
        color: 'var(--color-canvas)', // Darker than surface, creates debossed look
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 0,
      }}>
        AUDITX
      </div>

      {/* CTA Section */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: 1400,
        margin: '0 auto',
        padding: '100px 28px 80px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 40,
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 800,
            fontSize: 'clamp(32px, 4vw, 48px)',
            letterSpacing: '-1px',
            color: 'var(--color-ink)',
            marginBottom: 12,
            lineHeight: 1.1,
          }}>
            Start auditing in 30 seconds.
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 14,
            color: 'var(--color-mute)',
          }}>
            Zero config. 15 scanners. MIT — free forever.
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'stretch',
          border: '1px solid var(--color-accent)',
          backgroundColor: 'var(--color-canvas)',
          flexShrink: 0,
        }}>
          <code style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--color-accent)',
            padding: '16px 24px',
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

      {/* Footer Bottom Bar (Terminal Style) */}
      <div style={{ position: 'relative', zIndex: 1, borderTop: '1px solid var(--color-hairline)', backgroundColor: 'var(--color-canvas)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexWrap: 'wrap' }}>
          
          {/* Links */}
          <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap' }}>
            {LINKS.map(link => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="nav-link-item"
                style={{ 
                  padding: '20px 28px', 
                  borderRight: '1px solid var(--color-hairline)', 
                  borderBottom: '1px solid var(--color-hairline)',
                  textTransform: 'uppercase',
                  fontSize: 12,
                  letterSpacing: '0.05em'
                }}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* System EOF Marker */}
          <div style={{ 
            padding: '20px 28px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 12, 
            borderBottom: '1px solid var(--color-hairline)',
            borderLeft: '1px solid var(--color-hairline)',
            backgroundColor: 'var(--color-surface)'
          }}>
             <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-mute)', fontWeight: 700 }}>[ EOF ]</span>
             <span className="cursor-blink" style={{ display: 'inline-block', width: 8, height: 14, backgroundColor: 'var(--color-accent)' }} />
          </div>
        </div>

        {/* Copyright */}
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '16px 28px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-mute)' }}>
            © 2026 auditx · MIT License · by{' '}
            <a href="https://parthmongia.dev" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-ink-light)' }}>
              Parth Mongia
            </a>
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-mute)' }}>
            built with auditx · zero critical findings
          </span>
        </div>
      </div>
    </footer>
  );
}
