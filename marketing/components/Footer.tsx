import CopyButton from './CopyButton';

const HR = '1px solid rgba(15,0,0,0.12)';
const FONT = 'inherit';

const LINKS = [
  { label: 'GitHub', href: 'https://github.com/parth308/auditx' },
  { label: 'npm',    href: 'https://www.npmjs.com/package/auditx' },
  { label: 'Issues', href: 'https://github.com/parth308/auditx/issues' },
  { label: 'MIT License', href: 'https://github.com/parth308/auditx/blob/main/LICENSE' },
  { label: 'README', href: 'https://github.com/parth308/auditx#readme' },
];

export default function Footer() {
  return (
    <footer style={{ marginTop: 96 }}>
      {/* CTA strip */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px' }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap' as const,
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
          padding: '40px 0',
          borderTop: HR,
          borderBottom: HR,
        }}>
          <div>
            <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 20, color: '#201d1d' }}>
              Start auditing in 30 seconds.
            </div>
            <div style={{ fontFamily: FONT, fontSize: 13, marginTop: 4, color: '#646262' }}>
              Zero config. 13 scanners. MIT — free forever.
            </div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 16px', borderRadius: 4,
            backgroundColor: '#f1eeee', border: '1px solid rgba(15,0,0,0.12)',
          }}>
            <code style={{ fontFamily: FONT, fontSize: 14, color: '#201d1d' }}>npx auditx .</code>
            <CopyButton code="npx auditx ." />
          </div>
        </div>
      </div>

      {/* Link grid */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', borderBottom: HR }}>
          {LINKS.map((link, i) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                textAlign: 'center',
                fontFamily: FONT,
                fontSize: 13,
                padding: '16px 8px',
                color: '#646262',
                borderRight: i < LINKS.length - 1 ? HR : 'none',
              }}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>

      {/* Copyright */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '16px 24px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 8 }}>
          <span style={{ fontFamily: FONT, fontSize: 13, color: '#9a9898' }}>
            © 2026 auditx — MIT License
          </span>
          <span style={{ fontFamily: FONT, fontSize: 13, color: '#9a9898' }}>
            built with auditx · zero critical findings
          </span>
        </div>
      </div>
    </footer>
  );
}
