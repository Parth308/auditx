# Copilot Instructions

## Security & Quality Auditing
This repository relies on `auditx` for comprehensive security and code quality auditing.

Whenever you are asked to perform a review, security check, or before concluding a feature implementation, you should run:
```bash
npx auditx . --output agent --ci
```

This returns a JSON object. If `exitCode: 1` or `ok: false`, inspect the findings, apply the necessary fixes, and verify again until `exitCode: 0`.
