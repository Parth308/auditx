import chalk from 'chalk';
import { getBinaryPath } from '../installer.js';

export async function runInstallCommand(): Promise<void> {
  console.log(chalk.cyan('\n  Pre-fetching all external scanners...\n'));
  try {
    await getBinaryPath('gitleaks');
    await getBinaryPath('trivy');
    await getBinaryPath('semgrep');
    await getBinaryPath('trufflehog');
    await getBinaryPath('osv-scanner');
    await getBinaryPath('shellcheck');
    
    console.log(chalk.cyan('  Installing npm-based scanners globally...'));
    const { execFileSync } = await import('child_process');
    execFileSync('npm', ['install', '-g', 'jscpd', 'depcheck', 'license-checker', 'typescript', 'cspell'], { stdio: 'ignore' });
    try {
      console.log(chalk.cyan('  Installing Python-based scanners globally...'));
      execFileSync('pip', ['install', 'lizard'], { stdio: 'ignore' });
    } catch (e) {
      console.log(chalk.yellow('  [!]  pip not found, skipping Python scanners (lizard).'));
    }

    console.log(chalk.green('\n  [+] All scanners installed successfully.\n'));
  } catch (err: any) {
    console.error(chalk.red(`\n  [-] Installation failed: ${err.message}\n`));
    process.exit(1);
  }
}
