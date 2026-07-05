import chalk from 'chalk';
import { execSync } from 'child_process';
import { getBinaryPath, type ToolName } from '../installer.js';

export async function checkDependencies(): Promise<void> {
  console.log(chalk.bold('\n  auditx — Dependency Check\n'));

  const tools: Array<{ name: ToolName; checkArgs: string[] }> = [
    { name: 'gitleaks', checkArgs: ['version'] },
    { name: 'trivy', checkArgs: ['--version'] },
    { name: 'semgrep', checkArgs: ['--version'] },
  ];

  for (const tool of tools) {
    try {
      const bin = await getBinaryPath(tool.name);
      execSync(`"${bin}" ${tool.checkArgs.join(' ')}`, { stdio: 'ignore' });
      console.log(`  ${chalk.green('✓')} ${tool.name.padEnd(12)} ${chalk.green('installed')}`);
    } catch {
      console.log(
        `  ${chalk.red('✗')} ${tool.name.padEnd(12)} ${chalk.red('not found')} — will be auto-installed on first run`,
      );
    }
  }

  // Also check npm
  try {
    execSync('npm --version', { stdio: 'ignore' });
    console.log(`  ${chalk.green('✓')} ${'npm'.padEnd(12)} ${chalk.green('installed')}`);
  } catch {
    console.log(`  ${chalk.red('✗')} ${'npm'.padEnd(12)} ${chalk.red('not found')}`);
  }

  console.log('');
}
