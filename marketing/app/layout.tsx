import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'auditx — One command. Every vulnerability. AI-ready.',
  description:
    'auditx runs 13 scanner categories in parallel — secrets, deps, SAST, AI-code anti-patterns, and more — then produces a structured report built for both humans and AI coding agents.',
  openGraph: {
    title: 'auditx — One command. Every vulnerability. AI-ready.',
    description:
      '13 scanners. Parallel execution. A 44-rule Semgrep ruleset targeting AI-generated code anti-patterns. Built for the agentic-coding era.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
