'use client';
import { useState } from 'react';

const NAV_LINKS = [
  { label: 'Scanners', href: '#scanners' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'CI', href: '#ci' },
  { label: 'GitHub', href: 'https://github.com/parth308/auditx' },
];

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backgroundColor: 'rgba(250,250,249,0.96)',
      backdropFilter: 'blur(14px)',
      borderBottom: '1px solid rgba(0,0,0,0.09)',
    }}>
      <div style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: '0 24px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Wordmark */}
        <a href="/" style={{
          fontFamily: 'inherit',
          fontWeight: 700,
          fontSize: 'clamp(16px, 2vw, 18px)',
          letterSpacing: '-0.4px',
          color: '#1a1a1a',
          flexShrink: 0,
        }}>
          auditx
        </a>

        {/* Desktop nav */}
        <nav className="nav-links">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              style={{
                fontFamily: 'inherit',
                fontSize: 'clamp(13px, 1.4vw, 15px)',
                fontWeight: 500,
                color: '#737373',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#1a1a1a')}
              onMouseLeave={e => (e.currentTarget.style.color = '#737373')}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {/* Desktop CTA */}
          <a
            href="https://www.npmjs.com/package/auditx"
            className="nav-cta"
            style={{
              fontFamily: 'inherit',
              fontSize: 'clamp(12px, 1.2vw, 14px)',
              fontWeight: 600,
              letterSpacing: '0.02em',
              padding: '7px 16px',
              backgroundColor: '#1a1a1a',
              color: '#fafaf9',
              whiteSpace: 'nowrap',
              transition: 'opacity 0.15s',
            }}
          >
            npm install -g auditx
          </a>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            className="mobile-menu-btn"
            style={{
              display: 'none',
              fontFamily: 'inherit',
              fontSize: 18,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#1a1a1a',
            }}
          >
            {menuOpen ? '[x]' : '[=]'}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div style={{
          padding: '8px 24px 16px',
          borderTop: '1px solid rgba(0,0,0,0.09)',
          backgroundColor: '#fafaf9',
        }}>
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'block',
                fontFamily: 'inherit',
                fontSize: 15,
                fontWeight: 500,
                padding: '10px 0',
                color: '#1a1a1a',
                borderBottom: '1px solid rgba(0,0,0,0.07)',
              }}
            >
              {link.label}
            </a>
          ))}
          <a
            href="https://www.npmjs.com/package/auditx"
            style={{
              display: 'block',
              fontFamily: 'inherit',
              fontSize: 14,
              fontWeight: 600,
              padding: '10px 0 0',
              color: '#1a1a1a',
            }}
          >
            [+] npm install -g auditx
          </a>
        </div>
      )}
    </header>
  );
}
