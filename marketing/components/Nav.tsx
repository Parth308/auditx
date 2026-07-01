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
        <a href="/" style={{ color: '#201d1d', fontFamily: 'inherit', fontWeight: 700, fontSize: 16, letterSpacing: '-0.5px' }}>
          auditx
        </a>

        {/* Desktop nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 500, color: '#201d1d', opacity: 0.7 }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a
            href="https://www.npmjs.com/package/auditx"
            style={{
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 500,
              padding: '6px 16px',
              borderRadius: 4,
              backgroundColor: '#201d1d',
              color: '#fdfcfc',
              whiteSpace: 'nowrap',
            }}
          >
            npm install -g auditx
          </a>
        </div>
      </div>
    </header>
  );
}
