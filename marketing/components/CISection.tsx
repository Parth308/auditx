import ScrollReveal from './ScrollReveal';
import CopyButton from './CopyButton';

const HR = '1px solid rgba(15,0,0,0.12)';
const FONT = 'inherit';

const GHA = `# .github/workflows/audit.yml
name: Security Audit
on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Run auditx
        run: npx auditx . --severity high --ci
      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: audit-report
          path: audit-report.md`;

const HOOK = `# Install pre-commit + pre-push hooks
auditx hook install

# Or install specific hooks
auditx hook install --pre-commit
auditx hook install --pre-push

# Hooks auto-run on staged files only — fast.
# Full project scan on push.`;

const HOOK_FEATURES = [
  '[+] pre-commit: scans staged files only — milliseconds',
  '[+] pre-push: full project scan before remote',
  '[+] post-merge: catch regressions after pulls',
  '[+] Preserves and chains existing husky hooks',
  '[+] --staged-list: pass exact file list to runners',
];

export default function CISection() {
  return (
    <section id="ci" style={{ maxWidth: 960, margin: '0 auto', padding: '96px 24px 0' }}>
      <ScrollReveal>
        <div style={{ borderBottom: HR, paddingBottom: 12, marginBottom: 0 }}>
          <div style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: '#201d1d' }}>
            [+] CI / Git hook integration
          </div>
          <div style={{ fontFamily: FONT, fontSize: 14, marginTop: 6, color: '#646262' }}>
            Exit code 1 on findings. Drop into any pipeline. Install hooks in one command.
          </div>
        </div>
      </ScrollReveal>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', border: HR, borderTop: 'none' }}>
        {/* GHA block */}
        <ScrollReveal>
          <div style={{ borderRight: HR, position: 'relative' }}>
            <div style={{
              fontFamily: FONT, fontSize: 12, padding: '8px 16px',
              color: '#646262', borderBottom: HR, backgroundColor: '#f8f7f7',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>GitHub Actions</span>
              <CopyButton code={GHA} />
            </div>
            <pre style={{
              fontFamily: FONT, fontSize: 12, padding: '16px', lineHeight: 1.75,
              color: '#201d1d', backgroundColor: '#fdfcfc', overflowX: 'auto', margin: 0,
            }}>
              {GHA}
            </pre>
          </div>
        </ScrollReveal>

        {/* Git hooks block */}
        <ScrollReveal delay={80}>
          <div>
            <div style={{
              fontFamily: FONT, fontSize: 12, padding: '8px 16px',
              color: '#646262', borderBottom: HR, backgroundColor: '#f8f7f7',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>Git hooks</span>
              <CopyButton code={HOOK} />
            </div>
            <pre style={{
              fontFamily: FONT, fontSize: 12, padding: '16px', lineHeight: 1.75,
              color: '#201d1d', backgroundColor: '#fdfcfc', overflowX: 'auto', margin: 0,
              borderBottom: HR,
            }}>
              {HOOK}
            </pre>
            <div style={{ padding: '16px' }}>
              {HOOK_FEATURES.map((f) => (
                <div key={f} style={{ fontFamily: FONT, fontSize: 13, color: '#424245', lineHeight: 1.9 }}>{f}</div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
