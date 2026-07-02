import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const jbMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://auditx-cli.vercel.app'),
  title: {
    default: 'auditx — One command. Every vulnerability. AI-ready.',
    template: '%s | auditx',
  },
  description:
    'auditx is a zero-config security CLI that runs 13 scanner categories in parallel (Secrets, Deps, SAST, AI-patterns) and outputs structured data for both developers and AI agents.',
  applicationName: 'auditx',
  authors: [{ name: 'Parth Mongia', url: 'https://parthmongia.dev' }],
  creator: 'Parth Mongia',
  publisher: 'Parth Mongia',
  keywords: [
    'security audit',
    'cli tool',
    'vulnerability scanner',
    'sast',
    'npm audit',
    'gitleaks',
    'trivy',
    'semgrep',
    'ai coding agents',
    'cybersecurity',
    'devsecops',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'auditx — One command. Every vulnerability. AI-ready.',
    description:
      'Zero-config security CLI. 13 scanners running in parallel. 44 custom rules for AI code anti-patterns. Built for the agentic-coding era.',
    url: 'https://auditx-cli.vercel.app',
    siteName: 'auditx',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'auditx — Security Audits for the AI Era',
    description:
      'One command runs 13 scanners. Detects secrets, vulnerable deps, and AI-generated code anti-patterns. Built by @parth308.',
    creator: '@parth308',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jbMono.variable}`}>
      <body className="font-sans antialiased bg-canvas text-ink overflow-x-hidden">{children}</body>
    </html>
  );
}
