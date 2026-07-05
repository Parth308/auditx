import type { AuditReport, Severity } from '../types.js';

function sevToSarifLevel(sev: Severity): 'error' | 'warning' | 'note' {
  if (sev === 'critical' || sev === 'high') return 'error';
  if (sev === 'medium') return 'warning';
  return 'note';
}

export function formatSarif(report: AuditReport): string {
  return JSON.stringify({
    $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
    version: "2.1.0",
    runs: [{
      tool: {
        driver: {
          name: "auditx",
          informationUri: "https://auditx-cli.vercel.app",
          rules: []
        }
      },
      results: report.findings.map(f => ({
        ruleId: f.rule ?? f.category,
        level: sevToSarifLevel(f.severity),
        message: { text: f.description ?? f.title },
        locations: f.file ? [{
          physicalLocation: {
            artifactLocation: { uri: f.file.replace(/\\/g, '/') },
            region: { startLine: f.line ?? 1 }
          }
        }] : [],
      })),
    }],
  }, null, 2);
}
