import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import chalk from 'chalk';

const MARKER_START = '<!-- auditx-agent-config-start -->';
const MARKER_END = '<!-- auditx-agent-config-end -->';

const CORE_INSTRUCTION = `## Security & Quality Auditing
This repo uses \`auditx\` for security, dependency, SAST, dead-code, and AI-generated-code-pattern audits.

Run before finishing any task, committing, or opening a PR:

\`\`\`bash
npx auditx . --output agent --ci
\`\`\`

Returns single-line JSON: \`{ok, exitCode, counts, files, findings}\`.
- \`ok: false\` or \`exitCode: 1\` means critical/high findings exist — do not consider the task done.
- Group findings by \`findings[].file\`, fix each. Findings with a \`fix\` field have a suggested resolution.
- Re-run the command after fixing until \`ok: true\`.

Full human-readable report: \`npx auditx .\` → writes \`audit-report.md\` in the repo root.`;

const STAMPED = `${MARKER_START}\n${CORE_INSTRUCTION}\n${MARKER_END}`;

const TEMPLATES: Record<string, { path: string; content: string; label: string }> = {
  agents: {
    path: 'AGENTS.md',
    content: `# AGENTS.md\n\n${STAMPED}\n`,
    label: 'AGENTS.md (general — Claude Code, Antigravity, etc.)',
  },
  cursor: {
    path: '.cursor/rules/auditx.mdc',
    content: `---\ndescription: auditx security & quality auditing\nalwaysApply: true\n---\n\n${STAMPED}\n`,
    label: '.cursor/rules/auditx.mdc (Cursor)',
  },
  cursorLegacy: {
    path: '.cursorrules',
    content: `# Cursor Rules\n\n${STAMPED}\n`,
    label: '.cursorrules (Cursor legacy fallback)',
  },
  copilot: {
    path: '.github/copilot-instructions.md',
    content: `# Copilot Instructions\n\n${STAMPED}\n`,
    label: '.github/copilot-instructions.md (GitHub Copilot)',
  },
  claude: {
    path: '.claude/skills/auditx/SKILL.md',
    content: `---\nname: auditx\ndescription: Run a security, code quality, and AI-pattern audit on the codebase. Use when asked to check vulnerabilities, review code quality, or run security scans.\n---\n\n# auditx Claude Skill\n\n${STAMPED}\n`,
    label: '.claude/skills/auditx/SKILL.md (Claude Code skill)',
  },
};

function ensureDir(filePath: string) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export interface InitAgentOptions {
  only?: string[]; // subset of TEMPLATES keys, e.g. ['claude', 'cursor']
}

export function initAgent(targetDir: string, opts: InitAgentOptions = {}) {
  console.log(chalk.cyan('\n  [init] Initializing AI agent configuration files...\n'));

  const keys = opts.only && opts.only.length > 0 ? opts.only : Object.keys(TEMPLATES);
  let created = 0;
  let updated = 0;
  let merged = 0;

  for (const key of keys) {
    const tpl = TEMPLATES[key];
    if (!tpl) {
      console.log(chalk.yellow(`  [!]  Unknown target: ${key}, skipping.`));
      continue;
    }

    const filePath = resolve(targetDir, tpl.path);

    if (existsSync(filePath)) {
      const existing = readFileSync(filePath, 'utf8');

      if (existing.includes(MARKER_START) && existing.includes(MARKER_END)) {
        // Extract the existing block to check if it needs updating
        const startIdx = existing.indexOf(MARKER_START);
        const endIdx = existing.indexOf(MARKER_END) + MARKER_END.length;
        const existingBlock = existing.substring(startIdx, endIdx);

        if (existingBlock === STAMPED) {
          console.log(chalk.dim(`  = ${tpl.label} already up to date.`));
          continue;
        }

        // Safely replace just our block, preserving user's other rules!
        const newContent = existing.substring(0, startIdx) + STAMPED + existing.substring(endIdx);
        writeFileSync(filePath, newContent, 'utf8');
        console.log(chalk.green(`  ↻ Updated ${tpl.label}`));
        updated++;
      } else {
        // File exists but has no auditx markers, append it safely
        writeFileSync(filePath, `${existing.trimEnd()}\n\n${STAMPED}\n`, 'utf8');
        console.log(chalk.yellow(`  + Appended auditx section into existing ${tpl.label}`));
        merged++;
      }
    } else {
      ensureDir(filePath);
      writeFileSync(filePath, tpl.content, 'utf8');
      console.log(chalk.green(`  ✓ Created ${tpl.label}`));
      created++;
    }
  }

  console.log(
    chalk.green(
      `\n  [+] Done. ${created} created, ${updated} updated, ${merged} merged into existing files.\n`,
    ),
  );
}
