import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function applyFixes(targetDir: string): Promise<void> {
  console.log(chalk.cyan('\n  [fix] Applying auto-fixes in parallel...\n'));

  const runCommand = async (cmd: string, successMsg: string, failMsg: string, isKnip = false) => {
    try {
      await execAsync(cmd, { cwd: targetDir });
      console.log(chalk.green(`  [+] ${successMsg}`));
    } catch {
      if (isKnip) {
        console.log(chalk.dim(`  [.] ${failMsg}`));
      } else {
        console.log(chalk.yellow(`  [!] ${failMsg}`));
      }
    }
  };

  await Promise.all([
    runCommand('npm audit fix', 'npm audit fix applied', 'npm audit fix had issues'),
    runCommand('npx eslint --fix .', 'eslint --fix applied', 'eslint --fix had issues'),
    runCommand('npx knip --fix --allow-remove-files', 'knip --fix applied', 'knip --fix complete', true)
  ]);
}
