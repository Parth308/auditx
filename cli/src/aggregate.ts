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

  // Assign stable sequential IDs
  merged.forEach((f, i) => {
    f.id = `auditx-${String(i + 1).padStart(3, '0')}`;
  });

  return merged;
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
