import type { Metadata } from 'next';
import { Rajdhani, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';


const rajdhani = Rajdhani({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  weight: ['400', '500', '600', '700'],
});

const ibmMono = IBM_Plex_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://auditx-cli.vercel.app'),
  title: {
    default: 'auditx — One command. Every vulnerability. AI-ready.',
    template: '%s | auditx',
  },
  description:
    'auditx is a zero-config security CLI running 22 scanners in parallel. Detect secrets, vulnerable deps, SAST issues, and AI code anti-patterns instantly.',
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
      'Zero-config security CLI. 22 scanners running in parallel. 100+ custom rules for AI code anti-patterns. Built for the agentic-coding era.',
    url: 'https://auditx-cli.vercel.app',
    siteName: 'auditx',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'auditx — Security Audits for the AI Era',
    description:
      'One command runs 22 scanners. Detects secrets, vulnerable deps, and AI-generated code anti-patterns. Built by @parth308.',
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

import { Analytics } from '@vercel/analytics/next';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'auditx',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Windows, macOS, Linux',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description:
      'auditx is a zero-config security CLI running 22 scanners in parallel. Detect secrets, vulnerable deps, SAST issues, and AI code anti-patterns instantly.',
    author: {
      '@type': 'Person',
      name: 'Parth Mongia',
      url: 'https://parthmongia.dev',
    },
    url: 'https://auditx-cli.vercel.app',
    applicationSubCategory: 'SecurityScanner',
  };

  return (
    <html lang="en" className={`${rajdhani.variable} ${ibmMono.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased overflow-x-hidden">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
