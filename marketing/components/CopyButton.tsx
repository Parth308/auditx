'use client';
import { useState } from 'react';

interface CopyButtonProps {
  code: string;
}

export default function CopyButton({ code }: CopyButtonProps) {
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
        fontFamily: 'inherit',
        fontSize: 12,
        padding: '2px 8px',
        borderRadius: 4,
        border: '1px solid rgba(15,0,0,0.2)',
        backgroundColor: copied ? '#201d1d' : 'transparent',
        color: copied ? '#fdfcfc' : '#646262',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
      }}
    >
      {copied ? '[copied]' : '[copy]'}
    </button>
  );
}
