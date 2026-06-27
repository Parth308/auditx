import type { AuditReport } from '../types.js';

/**
 * Serializes the AuditReport to a JSON string.
 * This is the machine-readable output format (--output json).
 * Matches the JSON schema defined in plan.md.
 */
export function formatJson(report: AuditReport): string {
  return JSON.stringify(report, null, 2);
}
