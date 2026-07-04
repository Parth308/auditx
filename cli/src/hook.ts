import { existsSync, writeFileSync, rmSync, mkdirSync, readFileSync, copyFileSync, chmodSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import chalk from 'chalk';

const MARKER = '# auditx-managed-hook v2';
type HookType = 'pre-commit' | 'pre-push' | 'post-merge' | 'post-checkout';

const SUPPORTED_HOOKS: HookType[] = ['pre-commit', 'pre-push', 'post-merge', 'post-checkout'];

function buildScript(type: HookType): string {
  const common = `#!/bin/sh
${MARKER}
# Bypass: AUDITX_SKIP=1 git commit ...  or  git commit --no-verify
if [ -n "$AUDITX_SKIP" ]; then
  echo "[*]  auditx skipped (AUDITX_SKIP set)"
  exit 0
fi

AUDITX_BIN="auditx"
if ! command -v auditx >/dev/null 2>&1; then
  AUDITX_BIN="npx --no-install auditx"
fi
`;

  if (type === 'pre-commit') {
    // scan staged files only — fast, scales to huge repos
    return `${common}
STAGED=$(git -c core.quotePath=false diff --cached --name-only --diff-filter=ACMR)
if [ -z "$STAGED" ]; then
  exit 0
fi

echo "[*]  auditx: scanning $(echo "$STAGED" | wc -l | tr -d ' ') staged file(s)..."

TMPFILE=$(mktemp)
echo "$STAGED" > "$TMPFILE"

timeout 120 $AUDITX_BIN . --ci --staged-list "$TMPFILE"
STATUS=$?
rm -f "$TMPFILE"

if [ $STATUS -eq 124 ]; then
  echo "[!]  auditx timed out after 120s. Skipping this run — investigate slow scanners."
  exit 0
fi

if [ $STATUS -ne 0 ]; then
  echo ""
  echo "[-] auditx found critical/high issues. Commit rejected."
  echo "Fix them, or bypass with: AUDITX_SKIP=1 git commit ... (not recommended)"
  exit 1
fi
`;
  }

  if (type === 'pre-push') {
    // full repo scan ok here — pushes are less frequent than commits
    return `${common}
timeout 300 $AUDITX_BIN . --ci
STATUS=$?
if [ $STATUS -eq 124 ]; then
  echo "[!]  auditx timed out after 300s on push. Skipping."
  exit 0
fi
if [ $STATUS -ne 0 ]; then
  echo "[-] auditx found critical/high issues. Push rejected."
  exit 1
fi
`;
  }

  if (type === 'post-merge' || type === 'post-checkout') {
    // just warn if dep/lockfile changed, don't block
    return `${common}
CHANGED=$(git diff --name-only ORIG_HEAD@{1} HEAD 2>/dev/null | grep -E 'package(-lock)?\\.json|pnpm-lock|yarn.lock')
if [ -n "$CHANGED" ]; then
  echo "[*]  Dependencies changed — running background auditx dep scan..."
  ($AUDITX_BIN . --skip secrets,sast,deadcode,iac,patterns,duplication,complexity,aicode,githealth,typesafety --output terminal &) 
fi
`;
  }

  return common;
}

function getGitRoot(): string {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
  } catch {
    console.error(chalk.red('\n  [-] Not a git repository.\n'));
    process.exit(1);
  }
}

function detectHuskyDir(gitRoot: string): string | null {
  const huskyDir = join(gitRoot, '.husky');
  return existsSync(huskyDir) ? huskyDir : null;
}

function resolveHooksDir(gitRoot: string): { dir: string; husky: boolean } {
  const husky = detectHuskyDir(gitRoot);
  if (husky) return { dir: husky, husky: true };
  return { dir: join(gitRoot, '.git', 'hooks'), husky: false };
}

export function installHook(type: HookType = 'pre-commit') {
  if (!SUPPORTED_HOOKS.includes(type)) {
    console.error(chalk.red(`\n  [-] Unsupported hook type: ${type}. Supported: ${SUPPORTED_HOOKS.join(', ')}\n`));
    process.exit(1);
  }

  const gitRoot = getGitRoot();
  const { dir: hooksDir, husky } = resolveHooksDir(gitRoot);
  if (!existsSync(hooksDir)) mkdirSync(hooksDir, { recursive: true });

  const hookPath = join(hooksDir, type);
  const script = buildScript(type);

  if (existsSync(hookPath)) {
    const existing = readFileSync(hookPath, 'utf8');

    if (existing.includes(MARKER)) {
      // re-install / upgrade in place, no duplicate chaining
      writeFileSync(hookPath, script, { encoding: 'utf8' });
      chmodSync(hookPath, 0o755);
      console.log(chalk.green(`\n  [+] auditx ${type} hook upgraded to v2.\n`));
      return;
    }

    // foreign hook — back up once, then chain
    const backupPath = `${hookPath}.auditx-backup`;
    if (!existsSync(backupPath)) copyFileSync(hookPath, backupPath);
    console.log(chalk.yellow(`  [!]  Existing ${type} hook found${husky ? ' (husky)' : ''}. Backed up to ${backupPath}`));

    const chained = `${existing.trimEnd()}\n\n${script}`;
    writeFileSync(hookPath, chained, { encoding: 'utf8' });
    chmodSync(hookPath, 0o755);
    console.log(chalk.green(`  [+] auditx chained into existing ${type} hook.\n`));
    return;
  }

  writeFileSync(hookPath, script, { encoding: 'utf8' });
  chmodSync(hookPath, 0o755);
  console.log(chalk.green(`\n  [+] Installed ${type} hook at ${hookPath}${husky ? ' (husky)' : ''}\n`));
}

export function uninstallHook(type: HookType = 'pre-commit') {
  const gitRoot = getGitRoot();
  const { dir: hooksDir } = resolveHooksDir(gitRoot);
  const hookPath = join(hooksDir, type);
  const backupPath = `${hookPath}.auditx-backup`;

  if (!existsSync(hookPath)) {
    console.log(chalk.yellow(`\n  [!]  No ${type} hook found.\n`));
    return;
  }

  const content = readFileSync(hookPath, 'utf8');
  if (!content.includes(MARKER)) {
    console.log(chalk.yellow(`\n  [!]  ${type} hook exists but wasn't installed by auditx. Skipping.\n`));
    return;
  }

  if (existsSync(backupPath)) {
    copyFileSync(backupPath, hookPath);
    rmSync(backupPath);
    console.log(chalk.green(`\n  [+] Restored original ${type} hook (auditx portion removed).\n`));
  } else {
    rmSync(hookPath);
    console.log(chalk.green(`\n  [+] Removed ${type} hook.\n`));
  }
}

export function installAll() {
  installHook('pre-commit');
  installHook('pre-push');
}