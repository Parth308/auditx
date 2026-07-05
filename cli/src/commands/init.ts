import chalk from 'chalk';
import { writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export async function runInitAgentCommand(): Promise<void> {
  const { initAgent } = await import('../agent-init.js');
  initAgent(process.cwd());
}

export function runInitRuleCommand(): void {
  const targetFile = resolve(process.cwd(), 'auditx.yml');
  if (existsSync(targetFile)) {
    console.log(chalk.yellow(`\n  [-] auditx.yml already exists at ${targetFile}\n`));
  } else {
    const template = `rules:
  - id: custom-rule-example
    patterns:
      - pattern: console.log($X)
    message: "Do not use console.log in production."
    languages: [javascript, typescript]
    severity: WARNING
`;
    writeFileSync(targetFile, template, 'utf8');
    console.log(chalk.green(`\n  [+] Created custom rule template at: ${targetFile}\n`));
  }
}
