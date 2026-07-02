import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'auditx — One command. Every vulnerability. AI-ready.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#fafaf9',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px 120px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 40 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 8,
            background: '#dc2626',
            display: 'flex',
            marginRight: 20
          }} />
          <div style={{
            fontSize: 48,
            fontWeight: 700,
            color: '#1a1a1a',
            letterSpacing: '-1px'
          }}>
            auditx
          </div>
        </div>
        
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-3px',
            color: '#1a1a1a',
            marginBottom: 24,
            maxWidth: 900
          }}
        >
          One command. Every vulnerability.
        </div>
        <div
          style={{
            fontSize: 32,
            fontWeight: 500,
            color: '#737373',
          }}
        >
          Zero-config security CLI. 13 scanners in parallel. AI-ready.
        </div>
      </div>
    ),
    { ...size }
  );
}
