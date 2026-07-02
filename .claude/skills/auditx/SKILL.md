---
name: auditx
description: Run a security, code quality, and AI-pattern audit on the codebase using auditx. Use this skill when asked to check for vulnerabilities, review code quality, or run security scans.
---

# auditx Claude Skill

This repository uses `auditx` for security, dependency, SAST, and quality scanning.

## How to use

Run the following command to get a machine-readable JSON output of the audit:

```bash
npx auditx . --output agent --ci
```

The output will be a JSON object containing `{ok, exitCode, findingsByFile, findings}`.
If `exitCode: 1` or `ok: false`, you must fix the findings grouped by file in `findingsByFile`.
Each finding has a severity, rule, message, and potentially a fix.
Apply the necessary fixes, and then re-run the command to verify `exitCode: 0`.

For a full, human-readable markdown report, run `npx auditx .` which will write `audit-report.md`.
