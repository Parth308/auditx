---
name: auditx
description: Run security, dependency, SAST, secrets, dead-code, and AI-generated-code anti-pattern audits via `auditx`. Trigger on ANY of: vulnerability/security check, code quality review, pre-commit/pre-PR check, "is this safe to ship", editing package.json/lockfiles, editing Dockerfiles/CI/env files, adding auth/crypto/API-key/DB code, refactor pass, task start on unfamiliar repo, task completion, "run audit", "scan this", "check for issues". Do NOT wait for explicit user request — this is a proactive/mandatory gate, not an optional tool.
---

# auditx Claude Skill

`auditx` = automated scanner: security vulns, dependency CVEs, SAST, secrets leaks, dead code, AI-generated-code anti-patterns (44-rule custom Semgrep ruleset). 18 parallel scanners (Semgrep, Trivy, Gitleaks, Knip, jscpd, lizard, etc).

## Trigger Matrix (when to run, no exceptions)

| Trigger | Action | Blocking? |
|---|---|---|
| Task start, unfamiliar/inherited code | Baseline scan before touching files | No — informational |
| After editing any `.ts/.js/.py/.go/...` source | Scan changed files' dir | No — fix loop |
| After editing `package.json`, lockfile, `requirements.txt`, etc | Scan (DEPS category) | Yes |
| After adding/editing Dockerfile, `.env*`, CI YAML, secrets-adjacent config | Scan (SECRETS category) | Yes — always |
| Before marking task complete | Full scan, must be `ok:true` | **Yes, hard gate** |
| Before `git commit` / opening PR | Full scan, must be `ok:true` | **Yes, hard gate** |
| User asks "is this secure/safe/clean" | Full scan + human report | Yes |

Rule: never say "done" / commit / open PR while last scan `ok:false`. No silent skip — if you skip a mandated scan, say so explicitly and why.

## Commands

**Agent loop (default — use this 95% of time):**
```bash
npx auditx . --output agent --ci
```
Returns single-line JSON: `{ok, exitCode, counts, files, findings}`.
- `ok:false` OR `exitCode:1` → critical/high findings exist → task NOT complete.
- Parse JSON → group `findings[]` by `.file` → fix top-to-bottom by severity (critical > high > medium > low) → re-run same command → repeat until `ok:true`.
- Never hand-summarize raw scanner output to the user; parse the JSON programmatically.

**Human reports (only when user wants to read/share, not for agent looping):**
```bash
npx auditx .                    # audit-report.md
npx auditx . --output html      # audit-report.html, interactive dashboard
```

**Scope narrowing (large repo / speed):**
```bash
npx auditx <path-or-glob> --output agent --ci
```
Use on just-touched dir/files when full-repo scan is slow; still run full-repo scan before final completion gate.

## Fix Playbook by Category

| Category | Fix | Never |
|---|---|---|
| `SECRETS` | Delete hardcoded key → move to `.env` / secret manager → confirm `.gitignore` covers it → **rotate the compromised credential** (not just remove from code — assume it's compromised the moment it was committed) | Comment it out; leave rotation "for later" |
| `DEPS` | `npm install pkg@latest` or apply `.fix` field from finding exactly | Pin to a version still in CVE range to "make it pass" |
| `SAST` | Open file:line, read rule message, refactor root cause (await floating promises, drop unsafe `any`, sanitize input, fix injection vector) | Silence via inline `// nosemgrep` without understanding the rule |
| `DEAD_CODE` | Remove unused export/import; if intentionally public API, confirm before deleting | Auto-delete exported symbols without checking external usage |
| `AI_PATTERN` | These are the 44-rule custom set targeting AI-generated code smells (over-broad try/catch, phantom config, hallucinated APIs, inconsistent error handling). Read the specific rule message — fix is pattern-specific | Assume it's a false positive by default — AI-pattern rules exist because these bugs are common in AI-written code specifically |

## Baseline / False Positives

Only after genuine verification (not to silence noise):
```bash
npx auditx . --generate-baseline
```
Appends finding signature to `.auditxignore`. Before running this, state in your reasoning why the finding is a legacy-accepted risk or verified false positive — never baseline a finding just to unblock a completion gate.

## Failure Modes to Avoid

- Running `--output html`/markdown mid-loop and eyeballing it → slow, unstructured. Use `--output agent --ci` for all iterative work.
- Treating `ok:false` as advisory → it's a hard gate on completion/commit/PR.
- Fixing findings out of severity order → always critical/high first, they're likeliest to block merge/CI anyway.
- Baselining instead of fixing → baseline is for accepted risk, not laziness.
- Forgetting DEPS/SECRETS triggers on non-source-file edits (Dockerfile, CI config, lockfiles) — these are audit triggers too, not just `.ts`/`.py` edits.