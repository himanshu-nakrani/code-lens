/**
 * Pure request validation + payload shaping for POST /api/analyze.
 * Free of I/O so unit tests call the shipped implementation directly.
 */

import type { AnalysisDepth, AnalyzeRequest, TaskId } from "./types";

export const VALID_TASKS: TaskId[] = [
  "explain",
  "fix_bugs",
  "generate_tests",
  "suggest_improvements",
  "security_audit",
  "architecture",
];

export const VALID_DEPTHS: AnalysisDepth[] = ["standard", "deep"];

export const MAX_CODE_CHARS = 100_000;
export const MAX_CONTEXT_CHARS = 40_000;
/** Deep mode includes more multi-file context. */
export const MAX_CONTEXT_CHARS_DEEP = 80_000;

export type AnalyzeFileInput = {
  name: string;
  path: string;
  content: string;
  language: string;
};

export type ValidateAnalyzeOk = {
  ok: true;
  tasks: TaskId[];
  files: AnalyzeFileInput[];
  selectedPath: string | null;
  filename: string;
  language: string;
  code: string;
  multiFileContext?: string;
  depth: AnalysisDepth;
};

export type ValidateAnalyzeErr = {
  ok: false;
  error: string;
  status: number;
};

export type ValidateAnalyzeResult = ValidateAnalyzeOk | ValidateAnalyzeErr;

/**
 * Validate and normalize an analyze request body.
 * Does not call the model — only shapes what will be sent.
 */
export function validateAnalyzeRequest(body: unknown): ValidateAnalyzeResult {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Invalid JSON body.", status: 400 };
  }

  const req = body as Partial<AnalyzeRequest>;

  const tasks = Array.isArray(req.tasks)
    ? req.tasks.filter((t): t is TaskId => VALID_TASKS.includes(t as TaskId))
    : [];

  if (tasks.length === 0) {
    return {
      ok: false,
      error: "Select at least one analysis task.",
      status: 400,
    };
  }

  const depth: AnalysisDepth =
    typeof req.depth === "string" && VALID_DEPTHS.includes(req.depth as AnalysisDepth)
      ? (req.depth as AnalysisDepth)
      : "standard";

  const rawFiles = Array.isArray(req.files) ? req.files : [];
  if (rawFiles.length === 0) {
    return {
      ok: false,
      error: "No files provided for analysis.",
      status: 400,
    };
  }

  const files: AnalyzeFileInput[] = rawFiles.map((f) => ({
    name: String(f?.name ?? "unknown"),
    path: String(f?.path ?? f?.name ?? "unknown"),
    content: String(f?.content ?? ""),
    language: String(f?.language ?? "text"),
  }));

  const selectedPath =
    typeof req.selectedPath === "string" && req.selectedPath.length > 0
      ? req.selectedPath
      : null;

  const contextCap = depth === "deep" ? MAX_CONTEXT_CHARS_DEEP : MAX_CONTEXT_CHARS;
  const perFileCtx = depth === "deep" ? 8000 : 4000;

  let filename: string;
  let language: string;
  let code: string;
  let multiFileContext: string | undefined;

  if (selectedPath) {
    const primary = files.find((f) => f.path === selectedPath) ?? files[0];
    filename = primary.path || primary.name;
    language = primary.language || "text";
    code = primary.content.slice(0, MAX_CODE_CHARS);

    const others = files
      .filter((f) => f.path !== primary.path)
      .map((f) => `// --- ${f.path} ---\n${f.content.slice(0, perFileCtx)}`)
      .join("\n\n")
      .slice(0, contextCap);
    if (others) multiFileContext = others;
  } else {
    filename =
      files.length === 1 ? files[0].path || files[0].name : "codebase";
    language = files.length === 1 ? files[0].language || "text" : "text";
    code = files
      .map(
        (f) =>
          `// ===== ${f.path || f.name} (${f.language}) =====\n${f.content}`
      )
      .join("\n\n")
      .slice(0, MAX_CODE_CHARS);
  }

  if (!code.trim()) {
    return {
      ok: false,
      error: "Selected file has no content to analyze.",
      status: 400,
    };
  }

  return {
    ok: true,
    tasks,
    files,
    selectedPath,
    filename,
    language,
    code,
    multiFileContext,
    depth,
  };
}

/** Strip secret-shaped substrings from error messages before returning to clients. */
export function redactSecrets(message: string): string {
  return message
    .replace(/xai-[a-zA-Z0-9_-]+/g, "[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]");
}
