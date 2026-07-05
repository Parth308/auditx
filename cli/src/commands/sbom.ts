import chalk from 'chalk';
import { resolve } from 'path';
import { execFileSync } from 'child_process';
import { getBinaryPath } from '../installer.js';

export async function generateSbom(targetDir: string, isInteractive: boolean): Promise<void> {
  const dest = resolve(targetDir, 'sbom.json');
  if (isInteractive) console.log(chalk.cyan('\n  [sbom] Generating CycloneDX SBOM...'));
  try {
    const bin = await getBinaryPath('trivy');
    execFileSync(bin, ['fs', '--format', 'cyclonedx', '--output', dest, '.'], { cwd: targetDir, stdio: 'ignore' });
    if (isInteractive) console.log(chalk.green(`  [+] SBOM successfully written to: ${chalk.bold('sbom.json')}`));
  } catch (err: any) {
    if (isInteractive) console.log(chalk.red(`  [-] Failed to generate SBOM: ${err.message}`));
  }
}
