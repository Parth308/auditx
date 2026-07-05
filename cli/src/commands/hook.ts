import chalk from 'chalk';

export async function runHookCommand(args: string[], opts: Record<string, any>): Promise<void> {
  const { installHook, uninstallHook, installAll } = await import('../hook.js');
  const action = args[1]; // e.g. `auditx hook install`
  const hookType = (opts['type'] || 'pre-commit') as any;

  if (action === 'install') {
    installHook(hookType);
  } else if (action === 'install-all') {
    installAll();
  } else if (action === 'uninstall') {
    uninstallHook(hookType);
  } else {
    console.error(chalk.red(`\n  [-] Unknown hook action: ${action}. Use 'install', 'install-all', or 'uninstall'.\n`));
    process.exit(1);
  }
}
