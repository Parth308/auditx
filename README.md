<div align="center">

<img src="https://raw.githubusercontent.com/parth/auditx/main/assets/logo.svg" alt="auditx" width="80" />

# auditx

**One command. Every vulnerability. AI-ready report.**

[![npm version](https://img.shields.io/npm/v/auditx?color=crimson&label=auditx)](https://www.npmjs.com/package/auditx)
[![npm downloads](https://img.shields.io/npm/dm/auditx?color=crimson)](https://www.npmjs.com/package/auditx)
[![Smithery Skill](https://img.shields.io/badge/Smithery_Skill-blue?logo=smithery)](https://smithery.ai/skills/parthmongia2005/auditx)
[![License](https://img.shields.io/badge/License-Apache_2.0-crimson.svg)](https://opensource.org/licenses/Apache-2.0)
[![CI](https://img.shields.io/github/actions/workflow/status/parth308/auditx/test.yml?label=CI&color=crimson)](https://github.com/parth308/auditx/actions)
[![TypeScript](https://img.shields.io/badge/built%20with-TypeScript-blue)](https://www.typescriptlang.org/)

**[🌐 Visit Website](https://auditx-cli.vercel.app/)** · **[💻 GitHub](https://github.com/parth308/auditx)**

</div>

---

## Quick Start

```bash
npx auditx@latest .
```

```
🛡️  auditx — scanning /home/parth/codeoracle
  ✓  stack detected: Node.js · TypeScript · Docker
  ✓  running 22 scanners in parallel...

  ████████████████████████████████ 100% (9.4s)

  ┌──────────────┬──────────┬────────┬────────┬──────┐
  │ Category     │ Critical │  High  │ Medium │  Low │
  ├──────────────┼──────────┼────────┼────────┼──────┤
  │ Secrets      │    1     │   0    │   0    │   0  │
  │ Dependencies │    0     │   3    │   5    │   2  │
  │ SAST         │    0     │   1    │   3    │   7  │
  │ AI_CODE      │    0     │   0    │   3    │   4  │
  │ Duplication  │    0     │   1    │   4    │   0  │
  │ Dep Health   │    0     │   0    │   2    │   3  │
  │ Type Safety  │    0     │   1    │   6    │   0  │
  │ Git Health   │    0     │   0    │   0    │   1  │
  │ License      │    0     │   1    │   0    │   0  │
  │ Dead Code    │    —     │   —    │   0    │  12  │
  │ IaC          │    0     │   0    │   1    │   0  │
  └──────────────┴──────────┴────────┴────────┴──────┘

  ⚠  1 critical · 7 high findings need immediate attention.
  ✓  Report written → audit-report.md
```

---

## The Problem

Running a comprehensive security audit today means:

1. Learning **6 different CLIs** with 6 different flags
2. Installing **6 different binaries** and keeping them updated
3. Parsing **6 different JSON schemas** and normalizing severities
4. Manually cross-referencing findings across tools
5. Writing a report by hand

`auditx` does all of this in one command.

---

## Why auditx

| Feature | `auditx` | Snyk | SonarQube | GitHub Advanced Security |
|---|---|---|---|---|
| **Price** | Free & Open Source | Expensive SaaS | Enterprise pricing | Enterprise pricing |
| **Setup** | `npx auditx@latest .` — zero config | Cloud account required | Heavy Java server | Tied to GitHub |
| **Data Privacy** | 100% local — nothing leaves your machine | Sends deps/code to cloud | Local or cloud | Cloud |
| **Scope** | Secrets + Deps + SAST + IaC + Dead Code | Mostly Deps & SAST | SAST & Code Quality | Secrets + Deps + SAST |
| **Underlying Engine** | Best-in-class OSS (Trivy, Semgrep, OSV, Shellcheck, etc.) | Proprietary | Proprietary | CodeQL (Proprietary) |
| **Execution Speed** | ~60s (Local AST, 18 parallel scanners) | ~45s (Cloud + ML) | Minutes (Build required) | Minutes (Build required) |

---

## Table of Contents

- [Quick Start](#quick-start)
- [The Problem](#the-problem)
- [Why auditx](#why-auditx)
- [Installation](#installation)
- [Usage](#usage)
- [What Gets Scanned](#what-gets-scanned)
- [Report Format](#report-format)
- [JSON Output Schema](#json-output-schema)
- [Suppressions & Baselines](#suppressions--baselines)
- [Custom Rules](#custom-rules)
- [AI Agent Integration](#ai-agent-integration)
- [CI Integration](#ci-integration)
- [Architecture](#architecture)
- [Performance & Scaling](#performance--scaling)
- [Development & Contributing](#development)

## Installation

```bash
# Global install (recommended)
npm install -g auditx

# Or zero-install — no global needed
npx auditx@latest .
```

**External binaries** (Gitleaks, Trivy, Semgrep) are **auto-downloaded and cached** to `~/.auditx/bin/` on first run. No manual setup.

To pre-fetch all dependencies:

```bash
auditx install
```

To verify everything is ready:

```bash
auditx --check-deps
```

---

## Usage

```bash
# Scan current directory
auditx .

# Scan specific path
auditx ./src
```

### Flags

```bash
# Output
auditx . --output-file report.md   # write to file (default: audit-report.md)
auditx . --output json             # machine-readable JSON
auditx . --output html             # interactive obsidian-styled HTML dashboard report (audit-report.html)
auditx . --output agent            # minimal single-line JSON for AI agents
auditx . --output terminal         # pretty print only, no file
auditx . --sbom                    # generate a CycloneDX SBOM (sbom.json)

# Filtering
auditx . --severity high           # only show: critical | high | medium | low
auditx . --skip secrets            # skip Gitleaks
auditx . --skip deps               # skip Trivy + npm audit
auditx . --skip sast               # skip Semgrep
auditx . --skip deadcode           # skip Knip

# Actions
auditx . --fix                     # auto-apply fixable issues (eslint --fix)
auditx . --ci                      # exit code 1 if findings exist (CI mode)
auditx . --watch                   # re-run on file changes
auditx . --no-cache                # bypass the blazing fast file-hashing cache layer
auditx hook install                # install git hooks (pre-commit, pre-push, etc.)
auditx . --staged-list <file>      # only scan specific files (used by git hooks)

# AI / Agents
auditx . --ai                      # append Claude AI risk summary to report
auditx . --ai-provider openai      # override AI provider: claude | openai | gemini
auditx . --ai-model gpt-4o         # override model
auditx . --output agent            # generate minimal JSON payload meant for AI agents
auditx . --output agent --instruct # append strict prompt instructions for fixing findings

# Info
auditx --version
auditx --check-deps

# Baselines
auditx . --generate-baseline       # write current findings to .auditxignore
auditx . --baseline custom.json    # use custom file instead of .auditxignore
```

---

## What Gets Scanned

| Category | Scanner | What It Finds |
|---|---|---|
| `SECRETS` | [Gitleaks](https://github.com/gitleaks/gitleaks) + [Trufflehog](https://github.com/trufflesecurity/trufflehog) | Hardcoded API keys, tokens, passwords — includes Active API validation! |
| `DEPS` | [Trivy](https://github.com/aquasecurity/trivy) + [OSV-Scanner](https://github.com/google/osv-scanner) + npm | CVEs in npm/pip/cargo packages with deep dependency traversal |
| `SAST` | [Semgrep](https://github.com/semgrep/semgrep) + [Shellcheck](https://github.com/koalaman/shellcheck) | SQL injection, XSS, eval usage, and unquoted variable bugs in `.sh` bash scripts |
| `AI_CODE` | `aipatterns` (100+ AST rules) | AI-generated anti-patterns & flaws (silent catches, React state mutation, NextJS/Express/Django/Go/Python bugs) |
| `DEAD_CODE` | [Knip](https://github.com/webpro-nl/knip) | Unused exports, unused imports, unused dependencies |
| `COMPLEXITY` | [Lizard](https://github.com/terryyin/lizard) | Cyclomatic complexity, function length, and deeply nested code blocks |
| `IaC` | [Trivy](https://github.com/aquasecurity/trivy) config | Dockerfile misconfig, k8s insecure defaults, Terraform issues |
| `PATTERNS` | ESLint + [CSpell](https://cspell.org/) | Prototype pollution, unsafe regex, and misspelled codebase variables/strings |
| `DUPLICATION` | [jscpd](https://github.com/kucherenko/jscpd) | Copy-pasted code blocks and exact clones across multiple files (polyglot) |
| `DEP_HEALTH` | [depcheck](https://github.com/depcheck/depcheck) | Packages present in package.json but entirely unused in code |
| `LICENSE` | [license-checker](https://github.com/davglass/license-checker) | Restrictive licenses (GPL/AGPL) that pose a legal risk |
| `TYPE_SAFETY` | `tsc` | TypeScript compilation errors and missing types |
| `GIT_HEALTH` | `git log` | Hotspot analysis — flags files modified 50+ times indicating architectural churn |
| `REACHABILITY` | `auditx` (Static Analysis) | Automatically downgrades noisy "vulnerable dependency" alerts to `[UNREACHABLE]` if the code path is never imported. |
| `SUPPLY_CHAIN` | `auditx` (Custom Heuristics) | Zero-day malware detection via install script scanning and typosquatting analysis |

### Stack Auto-Detection

`auditx` inspects the target directory and only runs relevant scanners. No config needed.

```
package.json present       →  npm audit · eslint · knip
requirements.txt present   →  pip-audit
Cargo.toml present         →  cargo audit
Dockerfile present         →  trivy config (IaC)
.git present               →  gitleaks (full history scan)
go.mod present             →  trivy go module scan
```

---

## Report Format

By default, `auditx` writes a structured Markdown report to `audit-report.md`.

<details>
<summary>📄 View sample report</summary>

```markdown
# 🛡️ auditx Security Report

**Target**: `/home/parth/projects/codeoracle`
**Scanned**: 2026-06-27 14:32:01 IST
**Duration**: 14.2s
**Stack detected**: Node.js · TypeScript · Docker
**Scanners run**: semgrep · trivy · gitleaks · knip · npm-audit · jscpd · depcheck · license-checker · typecheck · githealth

---

## Summary

| Category     | 🔴 Critical | 🟠 High | 🟡 Medium | 🔵 Low |
|---|---|---|---|---|
| Secrets      | 1 | 0 | 0 | 0 |
| Dependencies | 0 | 3 | 5 | 2 |
| SAST         | 0 | 1 | 3 | 7 |
| Duplication  | 0 | 1 | 4 | 0 |
| Dep Health   | 0 | 0 | 2 | 3 |
| Type Safety  | 0 | 1 | 6 | 0 |
| Git Health   | 0 | 0 | 0 | 1 |
| License      | 0 | 1 | 0 | 0 |
| Dead Code    | — | — | 0 | 12 |
| IaC          | 0 | 0 | 1 | 0 |
| **Total**    | **1** | **7** | **21** | **25** |

> ⚠️ 8 high/critical findings require immediate attention.

---

## 🔴 Critical

### [SECRETS] Hardcoded API key in source file
- **File**: `src/config/db.ts:14`
- **Rule**: `gitleaks/generic-api-key`
- **Match**: `OPENAI_API_KEY = "sk-proj-..."`
- **In git history**: Yes (commit `a3f91bc`)
- **Fix**: Remove from code · Add to `.env` · Rotate the key · Add `.env` to `.gitignore`

---

## 🟠 High

### [DEPS] CVE-2024-21501 — sanitize-html@2.11.0
- **Severity**: High (CVSS 7.5)
- **Description**: Prototype pollution via crafted input
- **Fix**: `npm install sanitize-html@2.13.0`

### [LICENSE] Restrictive License Detected: GPL-3.0
- **Severity**: High
- **Description**: The package 'ghost-script' uses a restrictive GPL-3.0 license.
- **Fix**: Replace package or consult legal if distributed.

### [DUPLICATION] Code duplication detected (42 lines)
- **File**: `src/services/billing.ts:102`
- **Rule**: `jscpd/duplication`
- **Description**: This block of code is identical to code in `src/services/legacy-billing.ts:40`.
- **Fix**: Extract logic into a shared utility function.


---

## 🤖 AI Analysis
*(Generated via `--ai` flag)*

**Top risks:**
The most critical exposure is a hardcoded API key committed to git history.
Rotating the key is mandatory — removal from code alone is insufficient.

**Fix priority:**
1. Rotate the exposed API key immediately
2. Fix SQL injection in `search.ts:87` — directly exploitable
3. Update `sanitize-html` — public PoC exploits exist
```

</details>



## JSON Output Schema

For programmatic use (`--output json`):

```json
{
  "meta": {
    "target": "/home/parth/codeoracle",
    "scannedAt": "2026-06-27T14:32:01Z",
    "durationMs": 8400,
    "stack": ["nodejs", "typescript", "docker"],
    "scanners": ["semgrep", "trivy", "gitleaks", "knip", "npm-audit"]
  },
  "summary": {
    "critical": 1,
    "high": 4,
    "medium": 9,
    "low": 21
  },
  "findings": [
    {
      "id": "auditx-001",
      "category": "SECRETS",
      "severity": "critical",
      "title": "Hardcoded API key in source file",
      "file": "src/config/db.ts",
      "line": 14,
      "rule": "gitleaks/generic-api-key",
      "scanner": "gitleaks",
      "fix": "Move to .env, rotate key",
      "inGitHistory": true
    }
  ]
}
```

---

## Suppressions & Baselines

Enterprises often have accepted risks or legacy code they can't fix immediately. You can establish a "baseline" to ignore existing issues, while still failing the build if *new* vulnerabilities are introduced.

1. **Generate the baseline**:
   ```bash
   npx auditx . --generate-baseline
   ```
   This creates an `.auditxignore` file containing signatures for all current findings.

2. **Run normal scans**:
   ```bash
   npx auditx . --ci
   ```
   `auditx` will now silently filter out any finding that exactly matches a signature in `.auditxignore`. 

> **Note**: Our baseline signatures intentionally omit line numbers. This means if a developer adds a new line of code at the top of a file, the baseline suppressions for that file won't break.

### Manual Configuration
You can also manually edit `.auditxignore` to create custom rules. Because `auditx` uses a flexible matching engine, you don't need to specify every field.

**1. Ignore a specific rule globally:**
```json
{
  "version": 1,
  "suppressions": [
    { "rule": "eslint/no-eval" }
  ]
}
```

**2. Ignore all vulnerabilities in a specific legacy file:**
```json
{
  "version": 1,
  "suppressions": [
    { "file": "src/legacy/spaghetti.ts" }
  ]
}
```

**3. Ignore a specific rule only in one file:**
```json
{
  "version": 1,
  "suppressions": [
    { 
      "rule": "eslint/dangerouslySetInnerHTML",
      "file": "src/components/Markdown.tsx"
    }
  ]
}
```

---

## Custom Rules (`auditx.yml`)

You can define company-specific rules (e.g., forbidding specific imports, enforcing naming conventions, or banning unsafe regex) directly within your repository.

To quickly generate a starter rule file, run:
```bash
npx auditx init-rule
```

This creates an `auditx.yml` file in your repository root. `auditx` uses [Semgrep's syntax](https://semgrep.dev/docs/writing-rules/rule-syntax) natively, which means you have full access to its powerful AST engine and can copy-paste thousands of open-source rules.

### Example 1: Banning a specific package
Block developers from importing `lodash` and enforce native ES6 methods.

```yaml
rules:
  - id: forbid-lodash
    patterns:
      - pattern: import $X from 'lodash'
    message: "Use native ES6 methods instead of lodash"
    languages: [javascript, typescript]
    severity: ERROR
```

### Example 2: Banning unsafe AST patterns
Block the usage of `dangerouslySetInnerHTML` across your React codebase.

```yaml
rules:
  - id: no-dangerously-set-innerhtml
    patterns:
      - pattern: dangerouslySetInnerHTML={...}
    message: "dangerouslySetInnerHTML can lead to XSS. Use safe HTML rendering."
    languages: [javascript, typescript]
    severity: ERROR
```

---

> 🤖 **AI agents**: run `npx auditx . --output agent --ci` for machine-readable JSON. See [AGENTS.md](AGENTS.md) for more details.

## AI Agent Integration

`auditx` is built as a **tool node in AI agent pipelines** and an **AI-native auditing guardrail**. It provides direct integrations for all major AI coding agents.

### 1. Zero-Config Project Rules (`npx auditx init-agent`)
Instruct any AI agent (Claude Code, Antigravity, Cursor, GitHub Copilot) working in your project to automatically run `auditx` scans on every edit. Run the following command in your repository root:
```bash
npx auditx init-agent
```
This generates targeted instruction files so the agents will automatically verify security and quality:
* **`AGENTS.md`**: For general agentic frameworks (Antigravity, Aider, etc.)
* **`.cursor/rules/auditx.mdc`**: For Cursor's Agent rules (always active)
* **`.cursorrules`**: For Cursor's legacy rules
* **`.github/copilot-instructions.md`**: For GitHub Copilot Chat
* **`.claude/skills/auditx/SKILL.md`**: Claude Code custom skill prompt ([View on Smithery](https://smithery.ai/skills/parthmongia2005/auditx))

### 2. Global MCP Tool for AI Clients
Run `auditx` as a Model Context Protocol (MCP) server to give your AI agent client global capabilities to audit files.

* **Claude Code CLI:**
  ```bash
  claude mcp add auditx npx -y --package auditx auditx-mcp
  ```
* **Cursor / Windsurf:** Add a new MCP server in Settings:
  * Type: `command`
  * Command: `npx -y --package auditx auditx-mcp`
* **Claude Desktop:** Add the following configuration block to your MCP config (`claude_desktop_config.json`):
  ```json
  {
    "mcpServers": {
      "auditx": {
        "command": "npx",
        "args": ["-y", "--package", "auditx", "auditx-mcp"]
      }
    }
  }
  ```

### 3. Agent Pipeline Output Mode (`--output agent`)
Use the `--output agent` flag to get a deterministic, token-cheap, single-line JSON string optimized specifically for LLMs. This suppresses all interactive CLI output, enabling AI agents to programmatically run, parse, and apply autofixes in an execution loop.

```
┌─────────────────────────────────────────────────────┐
│                   AI Agent Loop                     │
│                                                     │
│  1. shell("auditx . --output agent")                │
│         │                                           │
│         ├─ exitCode: 0 → ✅ codebase clean          │
│         │                                           │
│         └─ exitCode: 1 → findings exist             │
│               │                                     │
│               ├─ parse JSON object                  │
│               ├─ loop findingsByFile keys           │
│               ├─ send file + findings to LLM        │
│               ├─ apply fixes to file                │
│               └─ shell("auditx . --output agent")   │
│                  (verify fixes)                     │
└─────────────────────────────────────────────────────┘
```

```python
# Example agent pseudocode
result = shell("auditx . --output agent")
report = json.loads(result.stdout)

if report["exitCode"] != 0:
    for file, finding_ids in report["findingsByFile"].items():
        file_findings = [f for f in report["findings"] if f["id"] in finding_ids]
        
        for f in file_findings:
            if f["fixable"]:
                shell(f"npm install {f['fix']}") # Example dependency fix
            else:
                apply_llm_patch(file, f["msg"]) # Auto-fix pattern/sast
                
    # Verify fixes
    shell("auditx . --output agent")
```

The `--ai` flag calls your configured LLM provider and appends a plain-English risk analysis block directly to the `.md` report (for human consumption).

An MCP server is also available which provides an `audit_codebase` tool for Claude and other clients. See [MCP.md](MCP.md) for full details.

---

## CI Integration

Use `--ci` to get exit code `1` if any findings exist. Combine with `--severity` to control the threshold:

```yaml
# .github/workflows/audit.yml
name: Security Audit

on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Run auditx
        run: npx auditx@latest . --severity high --ci --output audit-report.md
      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: audit-report
          path: audit-report.md
```

---

## Architecture

```
auditx/
├── src/
│   ├── bin/auditx.ts          # CLI entry point (commander.js)
│   ├── detect.ts              # Stack detection from target directory
│   ├── runners/
│   │   ├── index.ts           # Runner registry + parallel executor
│   │   ├── semgrep.ts         # Semgrep JSON output parser
│   │   ├── trivy.ts           # Trivy fs + config parser
│   │   ├── gitleaks.ts        # Gitleaks JSON parser
│   │   ├── knip.ts            # Knip programmatic runner
│   │   ├── eslint.ts          # ESLint + security plugins
│   │   └── npmaudit.ts        # npm audit --json parser
│   ├── aggregate.ts           # Merge · dedupe · sort by severity
│   ├── formatters/
│   │   ├── markdown.ts        # .md report generator
│   │   ├── json.ts            # JSON output
│   │   └── terminal.ts        # Chalk-colored terminal output
│   ├── ai.ts                  # --ai flag: LLM call + report append
│   └── types.ts               # Finding · ScanResult · Config interfaces
├── tests/
│   ├── fixtures/              # Intentionally vulnerable test repos
│   └── runners/               # Unit tests per scanner
└── .github/
    └── workflows/
        └── test.yml           # CI: auditx scans itself on every push
```

**How it works:**

```
auditx . 
  │
  ├─ detect stack (package.json? Dockerfile? .git?)
  │
  ├─ spawn scanners in parallel (Promise.allSettled)
  │   ├─ gitleaks --no-git --source . -f json
  │   ├─ trivy fs . --format json
  │   ├─ semgrep --config p/security-audit --json
  │   ├─ aipatterns (built-in framework rules for AI flaws)
  │   ├─ knip --reporter json
  │   └─ npm audit --json
  │
  ├─ normalize all outputs → Finding[]
  ├─ deduplicate overlapping findings
  ├─ sort by severity
  │
  ├─ format → markdown | json | terminal
```

---

## Performance & Scaling (v0.1.23+)

`auditx` is optimized to run on massive enterprise monorepos (10,000+ files) with extreme speed:

- **Tier 1 Context-Free Filtering:** Before handing files over to heavy dataflow-tracing engines like Semgrep, `auditx` synchronously scans file texts with precise word-boundary regex for dangerous sinks/sources (e.g., `eval`, `req.body`, `SELECT ... ?`). Clean files are discarded instantly, bypassing 95% of the computational load.
- **Native File Hashing Cache:** Re-running a scan without changing files takes **0ms**. `auditx` recursively walks directories using native Node APIs, hashing file modified times (`mtimeMs`) and your CLI config (`--skip`, `--severity`), intercepting unchanged codebases before orchestration even begins.
- **File Batching (Chunking):** Node-based runners automatically chunk massive arrays of files into blocks of 500, preventing OS `E2BIG` (Argument list too long) crashes on Windows command lines.
- **LPT Orchestrator:** Uses a Token Bucket algorithm with Longest-Processing-Time-First (LPT) scheduling. The heaviest tools (Semgrep, Trivy) are queued first, ensuring 100% CPU utilization and eliminating "long tail" core idling.

---

## Development

```bash
git clone https://github.com/parth308/auditx
cd auditx/cli

npm install

# Run in dev mode (no build needed)
npm run dev -- .

# Type check
npm run typecheck

# Build for production
npm run build

# Run tests
npm test
```

---

## Contributing

Contributions welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Good first issues:**
- Add a new scanner runner (`src/runners/`)
- Add a new output formatter (`src/formatters/`)
- Add support for a new language/package manager
- Improve finding deduplication logic

Each scanner runner follows a simple interface — adding a new one is straightforward.

```typescript
// src/runners/yourscanner.ts
export async function run(targetPath: string): Promise<Finding[]> {
  // 1. spawn the binary
  // 2. parse its output
  // 3. return normalized Finding[]
}
```

---

## Roadmap

- [x] Core scanner orchestration (Trivy, Gitleaks, Semgrep, Knip)
- [x] Markdown + JSON + terminal output
- [x] Stack auto-detection
- [x] `--ai` flag with multi-provider support
- [x] `--ci` mode with exit codes
- [x] Auto-download scanner binaries
- [x] `--fix` auto-remediation
- [x] `--watch` dev mode
- [x] AI agent output mode (`--output agent`)
- [x] Git Hook integration (`--staged-list`, `auditx hook install`)
- [ ] VS Code extension
- [ ] Web dashboard (self-hostable)
- [ ] GitHub Action (official)

---

## License

Apache 2.0 © [Parth Mongia](https://parthmongia.dev) ([GitHub](https://github.com/parth308))

---

<div align="center">

Built with [Semgrep](https://semgrep.dev) · [Trivy](https://trivy.dev) · [OSV-Scanner](https://osv.dev/) · [TruffleHog](https://trufflesecurity.com/) · [ShellCheck](https://www.shellcheck.net/)

**If auditx found something in your codebase, it's working. ⭐ Star it.**

</div>
