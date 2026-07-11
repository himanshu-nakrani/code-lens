export type TaskId =
  | "explain"
  | "fix_bugs"
  | "generate_tests"
  | "suggest_improvements"
  | "security_audit"
  | "architecture";

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type AnalysisDepth = "standard" | "deep";

export interface CodeFile {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  size: number;
}

/** Structured finding with optional line targeting for gutter annotations. */
export interface Finding {
  title: string;
  detail: string;
  severity: Severity;
  line?: number;
  endLine?: number;
  category?: string;
  suggestion?: string;
  /** CWE / OWASP / rule id when known */
  ruleId?: string;
}

export interface BugFixes {
  summary: string;
  /** Plain strings for backward compat; prefer structured_issues when present */
  issues: string[];
  structured_issues?: Finding[];
  fixed_code: string;
}

export interface TestsResult {
  framework: string;
  code: string;
  /** Coverage notes or edge cases the suite targets */
  coverage_notes?: string[];
}

export interface SecurityAudit {
  summary: string;
  risk_level: Severity;
  findings: Finding[];
}

export interface ArchitectureReview {
  summary: string;
  coupling: "low" | "medium" | "high";
  cohesion: "low" | "medium" | "high";
  hotspots: Finding[];
  recommendations: string[];
}

/** Multi-axis quality scores from the model (0–100 each). */
export interface QualityDimensions {
  correctness?: number;
  security?: number;
  maintainability?: number;
  testability?: number;
  complexity?: number;
}

export interface AnalysisResult {
  explanation?: string;
  bug_fixes?: BugFixes;
  tests?: TestsResult;
  improvements?: string[];
  security?: SecurityAudit;
  architecture?: ArchitectureReview;
  /** Optional model-provided multi-axis scores */
  quality?: QualityDimensions;
}

export interface AnalyzeRequest {
  files: Array<{ name: string; path: string; content: string; language: string }>;
  selectedPath: string | null;
  tasks: TaskId[];
  depth?: AnalysisDepth;
}

export interface AnalyzeSuccess {
  ok: true;
  result: AnalysisResult;
  rawText?: string;
}

export interface AnalyzeError {
  ok: false;
  error: string;
  status?: number;
  rawText?: string;
  parseError?: boolean;
}

export type AnalyzeResponse = AnalyzeSuccess | AnalyzeError;

export const ALL_TASKS: {
  id: TaskId;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    id: "explain",
    label: "Explain",
    shortLabel: "explain",
    description: "Plain-English walkthrough of what the code does",
  },
  {
    id: "fix_bugs",
    label: "Fix Bugs",
    shortLabel: "bugs",
    description: "Identify bugs with severity + line numbers and propose corrected code",
  },
  {
    id: "generate_tests",
    label: "Generate Tests",
    shortLabel: "tests",
    description: "Unit tests covering happy path, edges, and regressions",
  },
  {
    id: "suggest_improvements",
    label: "Improvements",
    shortLabel: "quality",
    description: "Actionable refactors, quality, and performance tips",
  },
  {
    id: "security_audit",
    label: "Security",
    shortLabel: "sec",
    description: "OWASP-style security audit with severity-ranked findings",
  },
  {
    id: "architecture",
    label: "Architecture",
    shortLabel: "arch",
    description: "Coupling, cohesion, hotspots, and structural recommendations",
  },
];

export const SEVERITY_ORDER: Severity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
];

export function severityRank(s: Severity): number {
  const i = SEVERITY_ORDER.indexOf(s);
  return i === -1 ? 99 : i;
}
