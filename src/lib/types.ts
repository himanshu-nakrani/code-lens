export type TaskId = "explain" | "fix_bugs" | "generate_tests" | "suggest_improvements";

export interface CodeFile {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  size: number;
}

export interface BugFixes {
  summary: string;
  issues: string[];
  fixed_code: string;
}

export interface TestsResult {
  framework: string;
  code: string;
}

export interface AnalysisResult {
  explanation?: string;
  bug_fixes?: BugFixes;
  tests?: TestsResult;
  improvements?: string[];
}

export interface AnalyzeRequest {
  files: Array<{ name: string; path: string; content: string; language: string }>;
  selectedPath: string | null;
  tasks: TaskId[];
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

export const ALL_TASKS: { id: TaskId; label: string; description: string }[] = [
  { id: "explain", label: "Explain", description: "Plain-English explanation of the code" },
  { id: "fix_bugs", label: "Fix Bugs", description: "Identify bugs and propose corrected code" },
  { id: "generate_tests", label: "Generate Tests", description: "Unit tests in an appropriate framework" },
  { id: "suggest_improvements", label: "Suggest Improvements", description: "Refactors and quality suggestions" },
];
