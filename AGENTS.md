# AGENTS.md

## Security & Quality Auditing
This repo uses `auditx` for security/quality scans. Before committing or opening a PR:

```bash
npx auditx . --output agent --ci
```

Parses as JSON: `{ok, exitCode, files, findings[]}`. 
If `exitCode: 1` or `ok: false`, fix findings grouped by file (`findingsByFile` or `findings[].file`), each has: severity, rule, msg, and fix (if fixable).
Re-run to verify `exitCode: 0` before finishing.

Full human-readable report: `npx auditx .` (writes `audit-report.md`)
