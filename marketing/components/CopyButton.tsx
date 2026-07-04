'use client';
import { useState } from 'react';

export default function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      aria-label={copied ? 'Copied!' : 'Copy to clipboard'}
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        padding: '8px 12px',
        minHeight: 36,
        minWidth: 60,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid var(--color-hairline)',
        backgroundColor: copied ? 'var(--color-accent)' : 'transparent',
        color: copied ? 'var(--color-canvas)' : 'var(--color-mute)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
        fontWeight: 600,
        letterSpacing: '0.04em',
      }}
    >
      {copied ? 'copied' : 'copy'}
    </button>
  );
}
