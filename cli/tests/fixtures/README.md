# auditx Test Fixtures

This directory contains intentionally vulnerable code used to validate that auditx runners correctly detect security issues.

## fixture-node/

A Node.js project with deliberate security vulnerabilities:
- Hardcoded API keys (gitleaks)
- Vulnerable npm dependencies (npm audit)
- SQL injection via string concatenation (semgrep)
- `eval()` usage (eslint-plugin-security)
- Unused exports (knip)
