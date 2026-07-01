'use client';
import { useState } from 'react';

const NAV_LINKS = [
  { label: 'GitHub',   href: 'https://github.com/parth308/auditx' },
  { label: 'Docs',     href: '#how-it-works' },
  { label: 'Scanners', href: '#scanners' },
  { label: 'CI',       href: '#ci' },
];

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backgroundColor: 'rgba(253,252,252,0.95)',
      backdropFilter: 'blur(8px)',
      borderBottom: '1px solid rgba(15,0,0,0.12)',
    }}>
      <div style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: '0 24px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Wordmark */}
        <a href="/" style={{ fontFamily: 'inherit', fontWeight: 700, fontSize: 16, color: '#201d1d', letterSpacing: '-0.5px' }}>
          auditx
        </a>

        {/* Desktop nav links — hidden on mobile via .nav-links CSS class */}
        <nav className="nav-links">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 500, color: '#201d1d', opacity: 0.65 }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Desktop CTA — hidden on mobile */}
          <a
            href="https://www.npmjs.com/package/auditx"
            className="nav-cta"
            style={{
              fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
              padding: '6px 16px', borderRadius: 4,
              backgroundColor: '#201d1d', color: '#fdfcfc', whiteSpace: 'nowrap',
            }}
          >
            npm install -g auditx
          </a>

          {/* Mobile hamburger — shown by CSS on small screens */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            style={{
              fontFamily: 'inherit', fontSize: 18, lineHeight: 1,
              background: 'none', border: 'none', cursor: 'pointer', color: '#201d1d',
              display: 'none',  // overridden by CSS class below
            }}
            className="mobile-menu-btn"
          >
            {menuOpen ? '[x]' : '[=]'}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div style={{
          padding: '8px 24px 16px',
          borderTop: '1px solid rgba(15,0,0,0.12)',
          backgroundColor: '#fdfcfc',
        }}>
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'block',
                fontFamily: 'inherit', fontSize: 14, padding: '8px 0',
                color: '#201d1d', borderBottom: '1px solid rgba(15,0,0,0.08)',
              }}
            >
              {link.label}
            </a>
          ))}
          <a
            href="https://www.npmjs.com/package/auditx"
            style={{
              display: 'block', fontFamily: 'inherit', fontSize: 14,
              fontWeight: 600, padding: '10px 0', color: '#201d1d',
            }}
          >
            [+] npm install -g auditx
          </a>
        </div>
      )}
    </header>
  );
}
