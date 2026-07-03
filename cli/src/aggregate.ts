import type { Finding, ScanResult, Severity, SEVERITY_ORDER } from './types.js';
import { SEVERITY_ORDER as ORDER } from './types.js';

/**
 * Aggregates findings from all scan results:
 * 1. Flattens all findings into a single array
 * 2. Deduplicates by (file + line + rule) fingerprint
 * 3. Sorts by severity (critical → high → medium → low → info)
 */
export function aggregate(results: ScanResult[]): Finding[] {
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

  // Sort: most severe first
  merged.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);

  // Assign stable sequential IDs so we can reference them in correlations
  merged.forEach((f, i) => {
    f.id = `auditx-${String(i + 1).padStart(3, '0')}`;
  });

  const correlated = correlateFindings(merged);

  // Sort again in case correlations changed severities
  correlated.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);

  return correlated;
}

function correlateFindings(findings: Finding[]): Finding[] {
  const correlated: Finding[] = [];
  const handled = new Set<string>();

  const byFile: Record<string, Finding[]> = {};
  for (const f of findings) {
    if (!f.file) continue;
    if (!byFile[f.file]) byFile[f.file] = [];
    byFile[f.file].push(f);
  }

  let compoundCount = 1;

  for (const [file, fileFindings] of Object.entries(byFile)) {
    const secrets = fileFindings.filter(f => f.category === 'SECRETS');
    const sast = fileFindings.filter(f => ['SAST', 'AI_CODE', 'PATTERNS'].includes(f.category));
    const deadCode = fileFindings.filter(f => f.category === 'DEAD_CODE');
    const hotspots = fileFindings.filter(f => f.category === 'GIT_HEALTH');
    const duplicates = fileFindings.filter(f => f.category === 'DUPLICATION');

    // 1. Secrets in High-Churn Files (CRITICAL)
    for (const secret of secrets) {
      if (hotspots.length > 0 && !handled.has(secret.id)) {
        correlated.push({
          id: `auditx-c-${String(compoundCount++).padStart(3, '0')}`,
          category: 'COMPOUND',
          severity: 'critical',
          title: `Actively exploited-looking secret in high-churn file`,
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

    // 2. Dead Code + Vulnerabilities (LOW)
    // If there is dead code in the file, and a vulnerability, it might be unreachable.
    if (deadCode.length > 0) {
      const vulns = fileFindings.filter(f => ['SAST', 'SECRETS', 'AI_CODE'].includes(f.category) && !handled.has(f.id));
      for (const vuln of vulns) {
        correlated.push({
          ...vuln,
          id: `auditx-c-${String(compoundCount++).padStart(3, '0')}`,
          category: 'COMPOUND',
          severity: 'low',
          title: `[Unreachable] ${vuln.title}`,
          description: `This vulnerability is located in a file flagged as containing dead/unused code. It may not be reachable in production. Original: ${vuln.description || vuln.title}`,
          scanner: 'auditx-correlator',
          correlations: [vuln.id, ...deadCode.map(d => d.id)]
        });
        handled.add(vuln.id);
      }
    }

    // 3. Duplicated Vulnerabilities (HIGH)
    // If a vulnerability exists in a file with copy-pasted blocks, the vulnerability is likely propagated.
    if (duplicates.length > 0) {
      const vulns = fileFindings.filter(f => ['SAST', 'AI_CODE', 'PATTERNS'].includes(f.category) && !handled.has(f.id));
      for (const vuln of vulns) {
        correlated.push({
          ...vuln,
          id: `auditx-c-${String(compoundCount++).padStart(3, '0')}`,
          category: 'COMPOUND',
          severity: 'high',
          title: `[Propagated] ${vuln.title}`,
          description: `This vulnerability is inside a file with duplicated code blocks. You MUST check the other locations where this code was copy-pasted. Original: ${vuln.description || vuln.title}`,
          scanner: 'auditx-correlator',
          correlations: [vuln.id, ...duplicates.map(d => d.id)],
          fix: 'Fix this vulnerability and audit all other duplicated instances of this code block.'
        });
        handled.add(vuln.id);
      }
    }
  }

  // 4. Vulnerable Dependencies + Unauthenticated / Unsafe SAST logic (CRITICAL)
  // Cross-file correlation: If a DEPS scan found a critical CVE in 'express' or 'jsonwebtoken', 
  // and SAST found weak crypto or open endpoints, flag it.
  const allDeps = findings.filter(f => f.category === 'DEPS');
  const allSast = findings.filter(f => f.category === 'SAST' && !handled.has(f.id));
  
  const hasCriticalDep = allDeps.some(d => d.severity === 'critical' || d.severity === 'high');
  if (hasCriticalDep && allSast.length > 0) {
    for (const sast of allSast) {
      correlated.push({
        ...sast,
        id: `auditx-c-${String(compoundCount++).padStart(3, '0')}`,
        category: 'COMPOUND',
        severity: 'critical',
        title: `[High Risk Exposure] ${sast.title}`,
        description: `This codebase contains high-severity vulnerable dependencies AND this unsafe code logic. Attackers can chain these. Original: ${sast.description || sast.title}`,
        scanner: 'auditx-correlator',
        correlations: [sast.id, ...allDeps.filter(d => d.severity === 'critical').map(d => d.id)]
      });
      handled.add(sast.id);
    }
  }

  const remaining = findings.filter(f => !handled.has(f.id));
  return [...correlated, ...remaining];
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
