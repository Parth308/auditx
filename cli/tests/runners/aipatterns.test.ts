import { describe, it, expect } from 'vitest';
import { runAiPatterns } from '../../src/runners/ai/aipatterns.js';
import { resolve } from 'path';

describe('runAiPatterns', () => {
  it('should detect multiple AI anti-patterns in the fixture', async () => {
    const targetDir = resolve(__dirname, '../fixtures/ai-spaghetti.ts');
    const stack = {
      hasNodeJs: true,
      hasPython: false,
      hasRust: false,
      hasGo: false,
      hasDocker: false,
      hasGit: false,
      hasGitHistory: false,
      hasTerraform: false,
      hasTypeScript: true,
      hasReact: false,
      hasDjango: false,
      hasNextJs: false,
      hasNestJs: false,
      hasExpress: false,
      hasSql: false,
    };
    const result = await runAiPatterns(targetDir, undefined, stack);

    expect(result.ok).toBe(true);
    expect(result.scanner).toBe('aipatterns');
    const ruleIds = result.findings.map(f => f.rule?.split('.').pop());

    // Verify it caught the expected rules
    expect(ruleIds).toContain('ai-meaningless-wrapper');
    expect(ruleIds).toContain('ai-redundant-promise');
    expect(ruleIds).toContain('ai-silent-catch');
    expect(ruleIds).toContain('ai-redundant-boolean-compare');
    expect(ruleIds).toContain('ai-math-random-crypto');
    expect(ruleIds).toContain('ai-eval-usage');
    expect(ruleIds).toContain('ai-ts-any-cast');
    expect(ruleIds).toContain('ai-catch-reassign-ignore');
    expect(ruleIds).toContain('ai-console-log-leak');

    // Ensure they have proper severity mappings
    const findings = result.findings;
    for (const f of findings) {
      expect(f.severity).toMatch(/^(info|low|medium|high|critical)$/);
      expect(f.description).toBeTruthy();
    }
  }, 30000);
});
