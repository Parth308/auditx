import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import type { Finding, ScanResult, Severity, SEVERITY_ORDER, BaselineFile } from './types.js';
import { SEVERITY_ORDER as ORDER } from './types.js';
import { ReachabilityEngine } from './reachability.js';

/**
 * Generates a stable, deterministic 8-char hex ID from a finding's fingerprint.
 * This ensures IDs never shift when unrelated findings are fixed.
 */
function deterministicId(prefix: string, rule: string, file: string, line: string | number | undefined, title: string): string {
  const fingerprint = `${rule}::${file}::${line ?? ''}::${title}`;
  const hash = createHash('sha1').update(fingerprint).digest('hex').slice(0, 8);
  return `${prefix}-${hash}`;
}

/**
 * Aggregates findings from all scan results:
 * 1. Flattens all findings into a single array
 * 2. Deduplicates by (file + line + rule) fingerprint
 * 3. Sorts by severity (critical → high → medium → low → info)
 */
export function aggregate(results: ScanResult[], targetDir: string): Finding[] {
  const seen = new Set<string>();
  const merged: Finding[] = [];

  for (const result of results) {
    if (!result.ok) continue;

    for (const finding of result.findings) {
      // Build a dedup key from the most identifying attributes
      const key = `${finding.rule ?? ''}::${finding.file ?? ''}::${finding.line ?? ''}::${finding.title}`;

      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(finding);
    }
  }

  // Reachability Analysis
  if (targetDir) {
    const reachability = new ReachabilityEngine(targetDir);
    for (const finding of merged) {
      if (finding.category === 'DEPS' && finding.packageName) {
        if (!reachability.isReachable(finding.packageName)) {
          finding.severity = 'info';
          if (!finding.title.startsWith('[UNREACHABLE]')) {
            finding.title = `[UNREACHABLE] ${finding.title}`;
            finding.description = `[UNREACHABLE] This dependency is not directly imported in the source code. ${finding.description || ''}`;
          }
        }
      }
    }
  }

  // Sort: most severe first
  merged.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);

  // Assign stable deterministic IDs so they survive across scans even when
  // other findings are added or removed. Critical for CI baselining.
  merged.forEach((f) => {
    f.id = deterministicId('auditx', f.rule ?? '', f.file ?? '', f.line, f.title);
  });

  const correlated = correlateFindings(merged);

  // Sort again in case correlations changed severities
  correlated.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);

  return correlated;
}

function correlateFindings(findings: Finding[]): Finding[] {
  const correlated: Finding[] = [];
  const handled = new Set<string>();
  const byFile = groupByFile(findings);

  for (const [file, fileFindings] of Object.entries(byFile)) {
    const raw = fileFindings.filter(f => f.category !== 'COMPOUND');
    
    correlateChurnedSecrets(raw, file, correlated, handled);
    correlateDeadCodeVulns(raw, file, correlated, handled);
    correlateDuplicatedVulns(raw, file, correlated, handled);
  }

  correlateCrossFileDepsSast(findings, correlated, handled);

  const remaining = findings.filter(f => !handled.has(f.id));
  return [...correlated, ...remaining];
}

function groupByFile(findings: Finding[]): Record<string, Finding[]> {
  const byFile: Record<string, Finding[]> = {};
  for (const f of findings) {
    if (!f.file) continue;
    if (!byFile[f.file]) byFile[f.file] = [];
    byFile[f.file].push(f);
  }
  return byFile;
}

function correlateChurnedSecrets(raw: Finding[], file: string, correlated: Finding[], handled: Set<string>) {
  const secrets = raw.filter(f => f.category === 'SECRETS');
  const hotspots = raw.filter(f => f.category === 'GIT_HEALTH');
  
  if (hotspots.length === 0) return;

  for (const secret of secrets) {
    if (!handled.has(secret.id)) {
      const compTitle = `Actively exploited-looking secret in high-churn file`;
      correlated.push({
        id: deterministicId('auditx-c', secret.rule ?? 'compound-secret-churn', file, secret.line, compTitle),
        category: 'COMPOUND',
        severity: 'critical',
        title: compTitle,
        description: `A secret was found in a file with extremely high git churn. This indicates the secret is likely active, frequently deployed, and highly exposed. Original: ${secret.title}`,
        file,
        line: secret.line,
        scanner: 'auditx-correlator',
        correlations: [secret.id, ...hotspots.map(h => h.id)],
        fix: 'Immediately revoke/rotate this credential. Do not just remove it from the file.'
      });
      handled.add(secret.id);
    }
  }
}

function correlateDeadCodeVulns(raw: Finding[], file: string, correlated: Finding[], handled: Set<string>) {
  const deadCode = raw.filter(f => f.category === 'DEAD_CODE');
  if (deadCode.length === 0) return;

  const vulns = raw.filter(f => ['SAST', 'SECRETS', 'AI_CODE'].includes(f.category) && !handled.has(f.id));
  for (const vuln of vulns) {
    const unreachTitle = `[Unreachable] ${vuln.title}`;
    correlated.push({
      ...vuln,
      id: deterministicId('auditx-c', vuln.rule ?? 'compound-dead-code', file, vuln.line, unreachTitle),
      category: 'COMPOUND',
      severity: 'low',
      title: unreachTitle,
      description: `This vulnerability is located in a file flagged as containing dead/unused code. It may not be reachable in production. Original: ${vuln.description || vuln.title}`,
      scanner: 'auditx-correlator',
      correlations: [vuln.id, ...deadCode.map(d => d.id)]
    });
    handled.add(vuln.id);
  }
}

function correlateDuplicatedVulns(raw: Finding[], file: string, correlated: Finding[], handled: Set<string>) {
  const duplicates = raw.filter(f => f.category === 'DUPLICATION');
  if (duplicates.length === 0) return;

  const vulns = raw.filter(f => ['SAST', 'AI_CODE', 'PATTERNS'].includes(f.category) && !handled.has(f.id));
  for (const vuln of vulns) {
    const propTitle = `[Propagated] ${vuln.title}`;
    correlated.push({
      ...vuln,
      id: deterministicId('auditx-c', vuln.rule ?? 'compound-duplication', file, vuln.line, propTitle),
      category: 'COMPOUND',
      severity: 'high',
      title: propTitle,
      description: `This vulnerability is inside a file with duplicated code blocks. You MUST check the other locations where this code was copy-pasted. Original: ${vuln.description || vuln.title}`,
      scanner: 'auditx-correlator',
      correlations: [vuln.id, ...duplicates.map(d => d.id)],
      fix: 'Fix this vulnerability and audit all other duplicated instances of this code block.'
    });
    handled.add(vuln.id);
  }
}

function correlateCrossFileDepsSast(findings: Finding[], correlated: Finding[], handled: Set<string>) {
  const allDeps = findings.filter(f => f.category === 'DEPS');
  const allSast = findings.filter(f => f.category === 'SAST' && !handled.has(f.id));
  
  const hasCriticalDep = allDeps.some(d => d.severity === 'critical' || d.severity === 'high');
  if (!hasCriticalDep || allSast.length === 0) return;

  for (const sast of allSast) {
    const riskTitle = `[High Risk Exposure] ${sast.title}`;
    correlated.push({
      ...sast,
      id: deterministicId('auditx-c', sast.rule ?? 'compound-vuln-dep', sast.file ?? '', sast.line, riskTitle),
      category: 'COMPOUND',
      severity: 'critical',
      title: riskTitle,
      description: `This codebase contains high-severity vulnerable dependencies AND this unsafe code logic. Attackers can chain these. Original: ${sast.description || sast.title}`,
      scanner: 'auditx-correlator',
      correlations: [sast.id, ...allDeps.filter(d => d.severity === 'critical').map(d => d.id)]
    });
    handled.add(sast.id);
  }
}

/**
 * Reads a baseline file (.auditxignore) and removes any findings that match its suppression signatures.
 */
export function filterBaselines(findings: Finding[], baselinePath: string): Finding[] {
  if (!existsSync(baselinePath)) return findings;

  try {
    const raw = readFileSync(baselinePath, 'utf8');
    const baseline = JSON.parse(raw) as BaselineFile;
    if (!baseline || !baseline.suppressions || !Array.isArray(baseline.suppressions)) {
      return findings;
    }

    const signatures = baseline.suppressions;
    
    return findings.filter(f => {
      const isSuppressed = signatures.some(sig => {
        // A signature must define at least one constraint to be valid
        if (!sig.rule && !sig.file && !sig.title) return false;

        const matchRule = sig.rule ? sig.rule === f.rule : true;
        
        // Use endsWith to ensure it matches regardless of whether f.file is absolute or relative
        const matchFile = sig.file 
          ? (f.file ? f.file.replace(/\\/g, '/').endsWith(sig.file) : false) 
          : true;
          
        const matchTitle = sig.title ? sig.title === f.title : true;
        
        return matchRule && matchFile && matchTitle;
      });

      return !isSuppressed;
    });
  } catch (err) {
    // Fail open: if we can't parse the baseline, return all findings
    return findings;
  }
}

/** Filter findings to only those at or above the given minimum severity. */
export function filterBySeverity(findings: Finding[], minSeverity: Severity): Finding[] {
  const minOrder = ORDER[minSeverity];
  return findings.filter((f) => ORDER[f.severity] <= minOrder);
}

/** Build the summary counts object from a list of findings. */
export function buildSummary(findings: Finding[]) {
  return {
    critical: findings.filter((f) => f.severity === 'critical').length,
    high: findings.filter((f) => f.severity === 'high').length,
    medium: findings.filter((f) => f.severity === 'medium').length,
    low: findings.filter((f) => f.severity === 'low').length,
    info: findings.filter((f) => f.severity === 'info').length,
  };
}
