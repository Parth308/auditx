# auditx CLI

> One command. Every vulnerability. AI-ready markdown report.

`auditx` is a CLI tool that orchestrates multiple battle-tested security scanners against any local codebase, normalizes their output, and produces a structured `.md` report designed for both human review and AI agent consumption.

---

## Installation

```bash
# Global install
npm install -g auditx

# Or zero-install via npx
npx auditx .
```

### Prerequisites

These tools must be installed separately. `auditx --check-deps` will verify them:

| Tool | Purpose | Install |
|---|---|---|
| `gitleaks` | Secret scanning | [github.com/gitleaks/gitleaks](https://github.com/gitleaks/gitleaks#installing) |
| `trivy` | CVE + IaC scanning | [trivy.dev](https://trivy.dev/docs/getting-started/installation/) |
| `semgrep` | SAST analysis | [semgrep.dev](https://semgrep.dev/docs/getting-started/) |

---

## Usage

```bash
# Scan current directory (produces audit-report.md)
auditx .

# Scan specific path
auditx ./src

# Output modes
auditx . --output report.md        # write to file (default)
auditx . --output json             # machine-readable JSON
auditx . --output terminal         # pretty print, no file written

# Filtering
auditx . --severity high           # only show critical | high
auditx . --skip secrets            # skip gitleaks
auditx . --skip deps               # skip trivy + npm audit
auditx . --skip sast               # skip semgrep
auditx . --skip deadcode           # skip knip

# Actions
auditx . --fix                     # auto-apply fixable issues (eslint --fix)
auditx . --ci                      # exit 1 if any findings exist (CI pipelines)
auditx . --ai                      # append Claude AI analysis block to report
auditx . --watch                   # re-run on file changes (dev mode)

# Info
auditx --version
auditx --check-deps                # verify all scanner tools are installed
```

---

## Detection Categories

| Category | Scanner | What It Finds |
|---|---|---|
| `SECRETS` | gitleaks | Hardcoded API keys, tokens, passwords, connection strings |
| `DEPS` | trivy fs + npm audit | CVEs in npm/pip/cargo packages with CVSS scores |
| `SAST` | semgrep | SQL injection, eval, XSS, command injection, path traversal |
| `DEAD_CODE` | knip | Unused exports, imports, dependencies |
| `IaC` | trivy config | Dockerfile misconfig, k8s insecure defaults, terraform issues |
| `PATTERNS` | eslint + security plugins | Prototype pollution, unsafe regex, insecure randomness |

---

## Stack Auto-Detection

auditx inspects the target directory and only runs relevant scanners:

```
package.json   → npm audit, eslint, knip
requirements.txt / pyproject.toml → pip-audit
Cargo.toml     → cargo audit
Dockerfile     → trivy config (IaC)
.git present   → gitleaks (full history scan)
go.mod         → trivy go module scan
```

---

## AI Agent Integration

auditx is designed as a **tool node in AI agent pipelines**. The report format is deterministic — no LLM needed to parse it:

```python
result = shell("auditx . --output report.md --severity high --ci")

if result.exit_code != 0:
    report = read_file("report.md")
    findings = parse_md_table(report)

    for finding in findings.critical:
        create_github_issue(finding)

    for finding in findings.high:
        if finding.category == "DEPS":
            shell(f"npm install {finding.fix}")

    shell("auditx . --ci")  # re-run to verify fixes
```

---

## Development

```bash
# Install dependencies
npm install

# Run in dev mode (tsx, no build needed)
npm run dev -- .

# Type check
npm run typecheck

# Build for production
npm run build

# Run tests
npm test
```

---

## License

MIT © Parth
