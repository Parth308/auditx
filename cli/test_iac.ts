import { runIaC } from './src/runners/security/iac.js';
import { runTrivy } from './src/runners/security/trivy.js';

async function test() {
  console.log('Running IaC...');
  const res1 = await runIaC('..');
  console.log('IaC OK?', res1.ok);
  console.log('IaC Findings:', res1.findings.length);
  if (res1.findings.length > 0) {
    console.log(res1.findings[0]);
  }
  if (!res1.ok) {
    console.log('IaC Error:', res1.error);
  }

  console.log('\nRunning Trivy FS...');
  const res2 = await runTrivy('..');
  console.log('Trivy OK?', res2.ok);
  console.log('Trivy Findings:', res2.findings.length);
}

test().catch(console.error);
