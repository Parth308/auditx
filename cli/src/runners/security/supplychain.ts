// ─────────────────────────────────────────────────────────────────────────────
// auditx — Supply Chain Security Scanner
// Performs local-only, zero-dependency heuristic analysis for supply chain attacks.
//
// Checks performed:
//  1. Typosquatting (npm) — Levenshtein distance vs. Top-50 npm packages
//  2. Malicious install scripts — dangerous bash patterns in postinstall/preinstall
//  3. Registry override detection — packages resolved outside registry.npmjs.org
//  4. Package metadata anomaly — suspiciously sparse package.json with install hooks
//  5. Typosquatting (PyPI) — Levenshtein distance vs. Top-30 Python packages
//
// Architecture: Each check is a pure function returning Finding[]. The runner
// executes all checks in parallel via Promise.allSettled so one failure cannot
// block or crash the others.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import type { ScanResult, Finding, StackInfo } from '../../types.js';

// ─── Top-50 npm packages by download count ───────────────────────────────────
// Used for typosquatting detection (Levenshtein distance == 1)
const NPM_POPULAR_PACKAGES = new Set([
  // Core utils
  'lodash', 'underscore', 'chalk', 'debug', 'moment', 'uuid',
  // Networking
  'axios', 'node-fetch', 'got', 'superagent', 'request', 'cors',
  // CLI
  'commander', 'yargs', 'minimist', 'dotenv', 'ora', 'inquirer',
  // Frontend
  'react', 'react-dom', 'vue', 'angular', 'svelte', 'next', 'nuxt',
  'vite', 'webpack', 'rollup', 'esbuild', 'parcel',
  // Styling
  'tailwindcss', 'styled-components', 'emotion',
  // State
  'redux', 'zustand', 'mobx', 'jotai', 'recoil',
  // Server
  'express', 'fastify', 'koa', 'hapi', 'nest', 'nestjs',
  // Database
  'mongoose', 'sequelize', 'prisma', 'typeorm', 'knex',
  // Test
  'jest', 'mocha', 'vitest', 'chai', 'sinon', 'cypress',
  // Infra
  'typescript', 'eslint', 'prettier', 'babel', 'tsup', 'tsx',
  // Realtime
  'socket.io',
]);

// ─── Top PyPI packages ────────────────────────────────────────────────────────
const PYPI_POPULAR_PACKAGES = new Set([
  'requests', 'numpy', 'pandas', 'flask', 'django', 'fastapi',
  'sqlalchemy', 'boto3', 'pydantic', 'pytest', 'httpx', 'uvicorn',
  'celery', 'redis', 'pillow', 'scipy', 'matplotlib', 'tensorflow',
  'torch', 'scikit-learn', 'aiohttp', 'click', 'rich', 'typer',
  'cryptography', 'paramiko', 'pymongo', 'psycopg2', 'alembic',
]);


// ─── Dangerous install script patterns ───────────────────────────────────────
interface ScriptPattern {
  rgx: RegExp;
  rule: string;
  msg: string;
  fix: string;
  severity: 'critical' | 'high';
}

const DANGEROUS_SCRIPT_PATTERNS: ScriptPattern[] = [
  {
    rgx: /curl\s+.*?\|\s*(bash|sh|zsh)/,
    rule: 'supplychain/remote-exec-curl',
    msg: 'Executes a remote script via curl | bash — a classic code injection vector.',
    fix: 'Remove this package. Never install packages that download and execute remote code.',
    severity: 'critical',
  },
  {
    rgx: /wget\s+.*?\|\s*(bash|sh|zsh)/,
    rule: 'supplychain/remote-exec-wget',
    msg: 'Executes a remote script via wget | bash.',
    fix: 'Remove this package immediately.',
    severity: 'critical',
  },
  {
    rgx: /nc\s+.*-e\s*(\/bin\/)?(bash|sh)/,
    rule: 'supplychain/reverse-shell',
    msg: 'Contains a netcat reverse shell — grants remote attacker access to your machine.',
    fix: 'Remove this package immediately and audit your system for compromise.',
    severity: 'critical',
  },
  {
    rgx: /\.ssh\//,
    rule: 'supplychain/ssh-key-exfil',
    msg: 'Accesses the .ssh directory — likely attempting to steal SSH private keys.',
    fix: 'Remove this package immediately. Rotate all SSH keys on this machine.',
    severity: 'critical',
  },
  {
    rgx: /\/etc\/shadow/,
    rule: 'supplychain/shadow-file-access',
    msg: 'Accesses /etc/shadow — attempting to read system password hashes.',
    fix: 'Remove this package immediately and audit your system for compromise.',
    severity: 'critical',
  },
  {
    rgx: /eval\s*\(\s*buffer\.from\s*\(.*?,\s*['"]base64['"]\)/,
    rule: 'supplychain/obfuscated-eval',
    msg: 'Contains obfuscated code: eval(Buffer.from(..., "base64")). This is a hallmark of malware.',
    fix: 'Remove this package and run a full system audit.',
    severity: 'critical',
  },
  {
    rgx: /process\.env\s*&&\s*(require|fetch|http)/,
    rule: 'supplychain/env-exfil',
    msg: 'Reads process.env variables before making a network request — indicates environment variable exfiltration.',
    fix: 'Remove this package. Your .env secrets may already be compromised.',
    severity: 'critical',
  },
  {
    rgx: /base64\s+-d\s*\|\s*(bash|sh)/,
    rule: 'supplychain/base64-shell',
    msg: 'Decodes and executes a base64-encoded shell command — strongly associated with obfuscated malware payloads.',
    fix: 'Remove this package immediately.',
    severity: 'critical',
  },
  {
    rgx: /python[32]?\s+-c\s+['"]import\s+os/,
    rule: 'supplychain/python-payload',
    msg: 'Runs an inline Python OS command in an install script — used for cross-platform malware.',
    fix: 'Remove this package immediately.',
    severity: 'high',
  },
  {
    rgx: /\/dev\/tcp\/[a-zA-Z0-9.-]+\/\d+/,
    rule: 'supplychain/bash-reverse-shell',
    msg: 'Contains a direct bash /dev/tcp network socket connection — common in reverse shell backdoors.',
    fix: 'Remove this package immediately and audit your system.',
    severity: 'critical',
  },
  {
    rgx: /chmod\s+.*777/,
    rule: 'supplychain/chmod-777',
    msg: 'Sets world-writable permissions (chmod 777) on files — used to persist malware.',
    fix: 'Remove this package and verify no system files were modified.',
    severity: 'high',
  },
];

// ─── Levenshtein distance (optimized two-row variant) ────────────────────────
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

// ─── Utility: get all package.json paths to check under node_modules ─────────
function getNodeModulesPkgPaths(nmPath: string): string[] {
  const paths: string[] = [];
  try {
    const entries = readdirSync(nmPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;

      const fullPath = join(nmPath, entry.name);
      let isDir = false;
      try {
        isDir = statSync(fullPath).isDirectory();
      } catch {
        continue;
      }

      if (!isDir) continue;

      if (entry.name.startsWith('@')) {
        // Scoped package — one level deeper
        try {
          const scopedEntries = readdirSync(fullPath, { withFileTypes: true });
          for (const sub of scopedEntries) {
            const subPath = join(fullPath, sub.name);
            let isSubDir = false;
            try {
              isSubDir = statSync(subPath).isDirectory();
            } catch {
              continue;
            }
            if (isSubDir) {
              paths.push(join(subPath, 'package.json'));
            }
          }
        } catch {}
      } else {
        paths.push(join(fullPath, 'package.json'));
      }
    }
  } catch {}
  return paths;
}

// ─── Check 1: npm Typosquatting ───────────────────────────────────────────────
function checkTyposquatting(targetDir: string): Finding[] {
  const findings: Finding[] = [];
  const rootPkgPath = join(targetDir, 'package.json');
  if (!existsSync(rootPkgPath)) return findings;

  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(readFileSync(rootPkgPath, 'utf8'));
  } catch {
    return findings;
  }

  const allDeps = [
    ...Object.keys((pkg.dependencies as object) || {}),
    ...Object.keys((pkg.devDependencies as object) || {}),
    ...Object.keys((pkg.peerDependencies as object) || {}),
  ];

  const seen = new Set<string>();
  for (const dep of allDeps) {
    // Strip scope from scoped packages for comparison
    const depCore = dep.startsWith('@') ? dep.split('/')[1] ?? dep : dep;

    for (const popular of NPM_POPULAR_PACKAGES) {
      if (dep === popular || depCore === popular) continue;
      // Only compare if lengths are close (optimization)
      if (Math.abs(depCore.length - popular.length) > 2) continue;

      const dist = levenshtein(depCore, popular);
      if (dist === 1) {
        const key = `${dep}::${popular}`;
        if (seen.has(key)) continue;
        seen.add(key);

        findings.push({
          id: '',
          category: 'SUPPLY_CHAIN',
          severity: 'critical',
          title: `Possible npm typosquat: '${dep}' is 1 char away from '${popular}'`,
          file: 'package.json',
          rule: 'supplychain/typosquatting',
          scanner: 'supplychain',
          description: `'${dep}' has a Levenshtein distance of 1 from the extremely popular npm package '${popular}'. Typosquatting packages masquerade as legitimate ones to deliver malware. Verify you intended to install '${dep}' and not '${popular}'.`,
          fix: `Run: npm ls ${dep} and verify its origin. If unintentional, replace it with '${popular}' and run 'npm install'.`,
        });
      }
    }
  }
  return findings;
}

// ─── Check 2: Malicious install scripts ──────────────────────────────────────
function checkMaliciousScripts(targetDir: string): Finding[] {
  const findings: Finding[] = [];
  const nmPath = join(targetDir, 'node_modules');
  if (!existsSync(nmPath)) return findings;

  const pkgPaths = getNodeModulesPkgPaths(nmPath);
  const seenRules = new Set<string>();

  for (const p of pkgPaths) {
    if (!existsSync(p)) continue;
    let pkg: Record<string, unknown>;
    try {
      pkg = JSON.parse(readFileSync(p, 'utf8'));
    } catch {
      continue;
    }

    if (!pkg.scripts || typeof pkg.scripts !== 'object') continue;

    const scriptsStr = JSON.stringify(pkg.scripts).toLowerCase();

    for (const pattern of DANGEROUS_SCRIPT_PATTERNS) {
      const key = `${p}::${pattern.rule}`;
      if (seenRules.has(key)) continue;

      if (pattern.rgx.test(scriptsStr)) {
        seenRules.add(key);
        const relPath = relative(targetDir, p).replace(/\\/g, '/');
        findings.push({
          id: '',
          category: 'SUPPLY_CHAIN',
          severity: pattern.severity,
          title: `Malicious install script in '${pkg.name ?? 'unknown'}'`,
          file: relPath,
          rule: pattern.rule,
          scanner: 'supplychain',
          description: `Package '${pkg.name ?? p}' (${relPath}): ${pattern.msg}`,
          fix: pattern.fix,
        });
      }
    }
  }
  return findings;
}

// ─── Check 3: Registry override (non-npmjs.org packages in lockfile) ─────────
function checkRegistryOverrides(targetDir: string): Finding[] {
  const findings: Finding[] = [];
  const lockPath = join(targetDir, 'package-lock.json');
  if (!existsSync(lockPath)) return findings;

  let lock: Record<string, unknown>;
  try {
    lock = JSON.parse(readFileSync(lockPath, 'utf8'));
  } catch {
    return findings;
  }

  const packages = (lock.packages as Record<string, { resolved?: string }>) || {};
  const OFFICIAL_REGISTRY = 'https://registry.npmjs.org/';
  const seenOverrides = new Set<string>();

  for (const [name, info] of Object.entries(packages)) {
    if (!info?.resolved) continue;
    if (info.resolved.startsWith(OFFICIAL_REGISTRY)) continue;
    // Ignore local file: and git: resolutions — these are legitimate
    if (info.resolved.startsWith('file:') || info.resolved.startsWith('git')) continue;

    if (seenOverrides.has(name)) continue;
    seenOverrides.add(name);

    findings.push({
      id: '',
      category: 'SUPPLY_CHAIN',
      severity: 'high',
      title: `Non-official registry: '${name}'`,
      file: 'package-lock.json',
      rule: 'supplychain/non-official-registry',
      scanner: 'supplychain',
      description: `Package '${name}' is resolved from '${info.resolved}' which is NOT the official npm registry. This could be a private registry (legit) or a compromised mirror. Verify this is intentional.`,
      fix: `If this is an intentional private registry, add it to .npmrc explicitly. Otherwise remove this package and reinstall from the official registry.`,
    });
  }
  return findings;
}

// ─── Check 4: Package metadata anomaly detection ─────────────────────────────
// Malware packages are often hastily uploaded with no description, no author,
// no repository, but they DO have postinstall hooks. This combination is a
// strong signal of a supply chain attack.
function checkMetadataAnomalies(targetDir: string): Finding[] {
  const findings: Finding[] = [];
  const nmPath = join(targetDir, 'node_modules');
  if (!existsSync(nmPath)) return findings;

  const pkgPaths = getNodeModulesPkgPaths(nmPath);

  for (const p of pkgPaths) {
    if (!existsSync(p)) continue;
    let pkg: Record<string, unknown>;
    try {
      pkg = JSON.parse(readFileSync(p, 'utf8'));
    } catch {
      continue;
    }

    // Only flag packages that ALSO have install scripts (the dangerous combination)
    const scripts = pkg.scripts as Record<string, string> | undefined;
    const hasInstallHook = scripts && (
      scripts.preinstall || scripts.install || scripts.postinstall
    );
    if (!hasInstallHook) continue;

    const missingFields: string[] = [];
    if (!pkg.description) missingFields.push('description');
    if (!pkg.author && !pkg.maintainers) missingFields.push('author');
    if (!pkg.repository && !pkg.homepage) missingFields.push('repository/homepage');
    if (!pkg.license) missingFields.push('license');

    // If 3+ fields are missing AND it has an install hook, that's suspicious
    if (missingFields.length >= 3) {
      const relPath = relative(targetDir, p).replace(/\\/g, '/');
      findings.push({
        id: '',
        category: 'SUPPLY_CHAIN',
        severity: 'medium',
        title: `Suspicious package metadata: '${pkg.name ?? 'unknown'}' has install hooks but no metadata`,
        file: relPath,
        rule: 'supplychain/metadata-anomaly',
        scanner: 'supplychain',
        description: `Package '${pkg.name ?? p}' has an install-time hook (postinstall/preinstall) but is missing key metadata fields: ${missingFields.join(', ')}. Legitimate packages almost always have these. This combination is a hallmark of hastily uploaded malware.`,
        fix: `Inspect the package's install scripts manually: cat "${p}" | grep -A3 scripts. If you did not intentionally install it, remove it.`,
      });
    }
  }
  return findings;
}

// ─── Check 5: Python requirements.txt typosquatting ──────────────────────────
function checkPythonTyposquatting(targetDir: string): Finding[] {
  const findings: Finding[] = [];
  const reqPaths = [
    join(targetDir, 'requirements.txt'),
    join(targetDir, 'requirements-dev.txt'),
    join(targetDir, 'requirements-test.txt'),
  ];

  for (const reqPath of reqPaths) {
    if (!existsSync(reqPath)) continue;

    let lines: string[];
    try {
      lines = readFileSync(reqPath, 'utf8').split('\n');
    } catch {
      continue;
    }

    const seen = new Set<string>();
    for (const rawLine of lines) {
      // Strip comments first
      let line = rawLine.split('#')[0].trim();
      if (!line || line.startsWith('-')) continue;

      // Strip version specifiers and extras: requests[security]>=2.0 → requests
      line = line.replace(/[=><~!].*/, '').replace(/\[.*?\]/, '').trim().toLowerCase();
      if (!line) continue;

      for (const popular of PYPI_POPULAR_PACKAGES) {
        if (line === popular) continue;
        if (Math.abs(line.length - popular.length) > 2) continue;
        if (levenshtein(line, popular) === 1) {
          const key = `${line}::${popular}`;
          if (seen.has(key)) continue;
          seen.add(key);

          findings.push({
            id: '',
            category: 'SUPPLY_CHAIN',
            severity: 'critical',
            title: `Possible PyPI typosquat: '${line}' is 1 char away from '${popular}'`,
            file: relative(targetDir, reqPath).replace(/\\/g, '/'),
            rule: 'supplychain/pypi-typosquatting',
            scanner: 'supplychain',
            description: `The Python package '${line}' in your requirements file is 1 character away from the popular package '${popular}'. This is a common supply chain attack vector on PyPI.`,
            fix: `Verify '${line}' is the correct package. If you meant '${popular}', update requirements.txt and re-run pip install.`,
          });
        }
      }
    }
  }
  return findings;
}

// ─── Main runner ──────────────────────────────────────────────────────────────
//
// Design: Each check is run concurrently via Promise.allSettled.
// - If a check throws unexpectedly, it is silently skipped (no scanner crash).
// - All checks are pure functions returning Finding[], eliminating shared mutable state.
export async function runSupplychain(
  targetDir: string,
  _stagedFiles: string[] | undefined,
  stack: StackInfo,
): Promise<ScanResult> {
  const start = Date.now();

  // Fast exit for non-applicable stacks
  if (!stack.hasNodeJs && !stack.hasPython) {
    return { scanner: 'supplychain', ok: true, findings: [], durationMs: Date.now() - start };
  }

  // Build the list of checks to run based on detected stack
  type Check = () => Finding[];
  const checks: Check[] = [];

  if (stack.hasNodeJs) {
    checks.push(
      () => checkTyposquatting(targetDir),
      () => checkMaliciousScripts(targetDir),
      () => checkRegistryOverrides(targetDir),
      () => checkMetadataAnomalies(targetDir),
    );
  }

  if (stack.hasPython) {
    checks.push(() => checkPythonTyposquatting(targetDir));
  }

  // Run all checks concurrently. Each check is wrapped in a Promise so they
  // are parallel. Promise.allSettled guarantees we collect every result even
  // if one check throws.
  const results = await Promise.allSettled(
    checks.map(check => Promise.resolve().then(check)),
  );

  // Flatten fulfilled findings; silently discard rejected checks
  const findings: Finding[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      findings.push(...result.value);
    }
    // result.status === 'rejected' → one check crashed, don't fail the whole scan
  }

  return { scanner: 'supplychain', ok: true, findings, durationMs: Date.now() - start };
}
