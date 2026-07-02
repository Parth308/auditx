import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import chalk from 'chalk';

const AGENTS_MD = `# AGENTS.md

## Security & Quality Auditing
This repo uses \`auditx\` for security/quality scans. Before committing or opening a PR:

\`\`\`bash
npx auditx . --output agent --ci
\`\`\`

Parses as JSON: \`{ok, exitCode, files, findings[]}\`. 
If \`exitCode: 1\` or \`ok: false\`, fix findings grouped by file (\`findingsByFile\` or \`findings[].file\`), each has: severity, rule, msg, and fix (if fixable).
Re-run to verify \`exitCode: 0\` before finishing.

Full human-readable report: \`npx auditx .\` (writes \`audit-report.md\`)
`;

const CURSOR_RULES = `# Cursor Rules for auditx

## Security & Quality Auditing
This repo uses \`auditx\` for security/quality scans. Before committing or opening a PR, or when you are asked to review code quality/security:

\`\`\`bash
npx auditx . --output agent --ci
\`\`\`

Parses as JSON: \`{ok, exitCode, files, findings[]}\`. 
If \`exitCode: 1\` or \`ok: false\`, fix findings grouped by file (\`findingsByFile\` or \`findings[].file\`), each has: severity, rule, msg, and fix (if fixable).
Re-run to verify \`exitCode: 0\` before finishing.

Full human-readable report: \`npx auditx .\` (writes \`audit-report.md\`)
`;

const CLAUDE_SKILL = `---
name: auditx
description: Run a security, code quality, and AI-pattern audit on the codebase using auditx. Use this skill when asked to check for vulnerabilities, review code quality, or run security scans.
---

# auditx Claude Skill

This repository uses \`auditx\` for security, dependency, SAST, and quality scanning.

## How to use

Run the following command to get a machine-readable JSON output of the audit:

\`\`\`bash
npx auditx . --output agent --ci
\`\`\`

The output will be a JSON object containing \`{ok, exitCode, findingsByFile, findings}\`.
If \`exitCode: 1\` or \`ok: false\`, you must fix the findings grouped by file in \`findingsByFile\`.
Each finding has a severity, rule, message, and potentially a fix.
Apply the necessary fixes, and then re-run the command to verify \`exitCode: 0\`.

For a full, human-readable markdown report, run \`npx auditx .\` which will write \`audit-report.md\`.
`;

const COPILOT_INSTRUCTIONS = `# Copilot Instructions

## Security & Quality Auditing
This repository relies on \`auditx\` for comprehensive security and code quality auditing.

Whenever you are asked to perform a review, security check, or before concluding a feature implementation, you should run:
\`\`\`bash
npx auditx . --output agent --ci
\`\`\`

This returns a JSON object. If \`exitCode: 1\` or \`ok: false\`, inspect the findings, apply the necessary fixes, and verify again until \`exitCode: 0\`.
`;

function ensureDir(filePath: string) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function initAgent(targetDir: string) {
  console.log(chalk.cyan('\n  🤖 Initializing AI Agent configuration files...'));

  const filesToCreate = [
    { path: resolve(targetDir, 'AGENTS.md'), content: AGENTS_MD, name: 'AGENTS.md (General)' },
    { path: resolve(targetDir, '.cursorrules'), content: CURSOR_RULES, name: '.cursorrules (Cursor)' },
    { path: resolve(targetDir, '.github/copilot-instructions.md'), content: COPILOT_INSTRUCTIONS, name: '.github/copilot-instructions.md (GitHub Copilot)' },
    { path: resolve(targetDir, '.claude/skills/auditx/SKILL.md'), content: CLAUDE_SKILL, name: '.claude/skills/auditx/SKILL.md (Claude Code)' },
  ];

  let createdCount = 0;
  for (const file of filesToCreate) {
    if (existsSync(file.path)) {
      console.log(chalk.dim(`  - ${file.name} already exists, skipping.`));
    } else {
      ensureDir(file.path);
      writeFileSync(file.path, file.content, 'utf8');
      console.log(chalk.green(`  ✓ Created ${file.name}`));
      createdCount++;
    }
  }

  if (createdCount > 0) {
    console.log(chalk.green('\n  ✅ Agent integration files successfully created.\n'));
  } else {
    console.log(chalk.cyan('\n  ✅ All agent integration files are already present.\n'));
  }
}
