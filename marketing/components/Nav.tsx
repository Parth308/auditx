'use client';
import { useState, useEffect } from 'react';

const NAV_LINKS = [
  { label: 'Scanners',    href: '#scanners' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'CI',          href: '#ci' },
  { label: 'GitHub',      href: 'https://github.com/parth308/auditx' },
];

export default function Nav() {
  const [menuOpen, setMenuOpen]   = useState(false);
  const [scrolled, setScrolled]   = useState(false);
  const [copied, setCopied]       = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('npx auditx@latest .');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backgroundColor: scrolled ? 'rgba(10,10,15,0.88)' : 'rgba(10,10,15,0.6)',
      backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)',
      borderBottom: `1px solid ${scrolled ? 'rgba(255,255,255,0.07)' : 'transparent'}`,
      transition: 'background-color 0.3s ease, border-color 0.3s ease',
    }}>
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: '0 28px',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>

        {/* Wordmark */}
        <a href="/" style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          fontSize: 17,
          letterSpacing: '-0.3px',
          color: 'var(--color-ink)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: 'var(--color-accent)',
            animation: 'pulse-glow 2.4s ease-in-out infinite',
            flexShrink: 0,
          }} />
          auditx
        </a>

        {/* Desktop nav */}
        <nav className="nav-links">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="nav-link-item"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {/* Desktop CTA */}
          <button
            onClick={handleCopy}
            className="nav-cta"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.04em',
              padding: '7px 16px',
              backgroundColor: 'transparent',
              color: 'var(--color-accent)',
              border: '1px solid var(--color-accent)',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
              cursor: 'pointer',
              minWidth: '200px',
              textAlign: 'center',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'var(--color-accent)';
              e.currentTarget.style.color = 'var(--color-canvas)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--color-accent)';
            }}
          >
            <span>{copied ? '[COPIED]' : '> npx auditx@latest .'}</span>
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="mobile-menu-btn"
            aria-label="Toggle mobile menu"
            style={{
              display: 'none',
              background: 'transparent',
              border: '1px solid var(--color-hairline)',
              fontFamily: 'var(--font-mono)',
              fontSize: 14,
              color: 'var(--color-ink)',
              cursor: 'pointer',
              padding: '6px 10px',
            }}
          >
            {menuOpen ? '[x]' : '[=]'}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div style={{
          padding: '12px 28px 20px',
          borderTop: '1px solid var(--color-hairline)',
          backgroundColor: 'rgba(10,10,15,0.98)',
        }}>
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'block',
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                fontWeight: 500,
                padding: '11px 0',
                color: 'var(--color-ink-light)',
                borderBottom: '1px solid var(--color-hairline)',
              }}
            >
              {link.label}
            </a>
          ))}
          <button
            onClick={handleCopy}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              fontWeight: 600,
              padding: '12px 16px',
              marginTop: '12px',
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-canvas)',
              border: '1px solid var(--color-accent)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'var(--color-canvas)';
              e.currentTarget.style.color = 'var(--color-accent)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'var(--color-accent)';
              e.currentTarget.style.color = 'var(--color-canvas)';
            }}
          >
            <span>{copied ? '[COPIED]' : '> npx auditx@latest .'}</span>
          </button>
        </div>
      )}
    </header>
  );
}
