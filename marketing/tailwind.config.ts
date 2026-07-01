import type { Config } from 'tailwindcss';

// Tailwind v4 — this file is largely unused (config lives in CSS @theme).
// Kept for content scanning only.
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
};

export default config;
