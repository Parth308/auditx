// ─────────────────────────────────────────────────────────────────────────────
// auditx — Core type definitions
// ─────────────────────────────────────────────────────────────────────────────

/** Severity levels — ordered from most to least severe. */
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type AiProvider = 'claude' | 'openai' | 'gemini';

/** Detection categories, matching plan.md spec. */
export type Category =
  | 'SECRETS'
  | 'DEPS'
  | 'SAST'
  | 'DEAD_CODE'
  | 'IaC'
  | 'PATTERNS'
  | 'DUPLICATION'
  | 'COMPLEXITY'
  | 'DEP_HEALTH'
  | 'LICENSE'
  | 'AI_CODE'
  | 'GIT_HEALTH'
  | 'TYPE_SAFETY'
  | 'SUPPLY_CHAIN'
  | 'COMPOUND';

/** A single normalized security finding. */
export interface Finding {
  /** Unique finding ID, e.g. "auditx-001" */
  id: string;
  /** Detection category */
  category: Category;
  /** Severity level */
  severity: Severity;
  /** Short, human-readable title */
  title: string;
  /** Relative file path (if applicable) */
  file?: string;
  /** Line number (if applicable) */
  line?: number;
  /** Rule ID from the originating scanner */
  rule?: string;
  /** Name of the scanner that produced this finding */
  scanner: string;
  /** Human-readable description of the issue */
  description?: string;
  /** Actionable fix suggestion */
  fix?: string;
  /** CVE identifier (for DEPS findings) */
  cve?: string;
  /** CVSS score (for DEPS findings) */
  cvss?: number;
  /** Package name (for DEPS findings) */
  packageName?: string;
  /** Package version (for DEPS findings) */
  packageVersion?: string;
  /** Whether this secret exists in git history */
  inGitHistory?: boolean;
  /** The matched secret/code snippet (redacted safe preview) */
  match?: string;
  /** IDs of underlying findings that were correlated into this compound finding */
  correlations?: string[];
}

/** Result returned by each runner. */
export interface ScanResult {
  /** Runner name */
  scanner: string;
  /** Whether the scanner was available and ran successfully */
  ok: boolean;
  /** Findings from this scanner */
  findings: Finding[];
  /** Error message if the runner failed */
  error?: string;
  /** Duration in milliseconds */
  durationMs: number;
}

/** Detected stack / tech context of the target directory. */
export interface StackInfo {
  hasNodeJs: boolean;
  hasPython: boolean;
  hasRust: boolean;
  hasGo: boolean;
  hasDocker: boolean;
  hasGit: boolean;
  hasGitHistory: boolean;
  hasTerraform: boolean;
  hasTypeScript: boolean;
  hasReact: boolean;
  hasDjango: boolean;
  hasNextJs: boolean;
  hasNestJs: boolean;
  hasExpress: boolean;
  hasSql: boolean;
}

/** Resolved CLI configuration after arg parsing. */
export interface Config {
  /** Target directory to scan */
  target: string;
  /** Output mode */
  output: 'markdown' | 'json' | 'terminal' | 'agent' | 'sarif' | 'html';
  /** Output file path (for markdown mode) */
  outputFile: string;
  /** Minimum severity to include in results */
  severity: Severity;
  /** Scanners to skip */
  skip: Array<
    | 'secrets'
    | 'deps'
    | 'sast'
    | 'deadcode'
    | 'iac'
    | 'patterns'
    | 'duplication'
    | 'complexity'
    | 'dephealth'
    | 'license'
    | 'aicode'
    | 'githealth'
    | 'typesafety'
    | 'supplychain'
    | 'outdated'
    | 'todocheck'
  >;
  /** Optional array of staged files to scan (used by git hook) */
  stagedFiles?: string[];
  /** CI mode — exit 1 on any findings */
  ci: boolean;
  /** Append AI summary block to the report */
  ai: boolean;
  aiProvider?: AiProvider;
  aiModel?: string;
  /** Auto-apply fixable issues */
  fix: boolean;
  /** Re-run on file change */
  watch: boolean;
  /** Check that all required external tools are installed */
  checkDeps: boolean;
  /** Generate SBOM using Trivy */
  sbom: boolean;
  /** Generate baseline file instead of reporting */
  generateBaseline?: boolean;
  /** Custom path to the baseline file */
  baseline?: string;
}

/** The fully aggregated scan report. */
export interface AuditReport {
  meta: {
    target: string;
    scannedAt: string;
    durationMs: number;
    stack: string[];
    scanners: string[];
  };
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  findings: Finding[];
}

/** Severity ordering for sorting (lower = more severe). */
export const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

interface GlobalConfig {
  aiProvider?: AiProvider;
  openaiKey?: string;
  anthropicKey?: string;
  geminiKey?: string;
  aiModel?: string;
}

/** 
 * A signature used to suppress a finding. 
 * 'line' is intentionally omitted so suppressions survive code churn (e.g. adding new lines above a finding). 
 */
interface SuppressionSignature {
  rule?: string;
  file?: string;
  title?: string;
}

/** Format of the .auditxignore file */
export interface BaselineFile {
  version: number;
  suppressions: SuppressionSignature[];
}
