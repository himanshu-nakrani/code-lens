import type { AnalysisResult, BugFixes, TestsResult } from "./types";

/**
 * Robust JSON extraction from model output:
 * 1. JSON.parse full text
 * 2. Strip markdown fences and retry
 * 3. Substring from first { to last } and retry
 */
export function parseAnalysisJson(raw: string):
  | { ok: true; result: AnalysisResult }
  | { ok: false; error: string; rawText: string } {
  const text = (raw ?? "").trim();
  if (!text) {
    return { ok: false, error: "Model returned empty response.", rawText: raw ?? "" };
  }

  const attempts: string[] = [text];

  // Strip ```json ... ``` or ``` ... ```
  const fenced = text.replace(/^```(?:json|JSON)?\s*\n?/m, "").replace(/\n?```\s*$/m, "").trim();
  if (fenced !== text) attempts.push(fenced);

  // Also try removing all fence blocks more aggressively
  const noFences = text.replace(/```(?:json|JSON)?\s*/gi, "").replace(/```/g, "").trim();
  if (!attempts.includes(noFences)) attempts.push(noFences);

  // Substring first { to last }
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last > first) {
    const slice = text.slice(first, last + 1);
    if (!attempts.includes(slice)) attempts.push(slice);
  }

  let lastError = "Unknown parse error";
  for (const candidate of attempts) {
    try {
      const data = JSON.parse(candidate);
      if (data && typeof data === "object" && !Array.isArray(data)) {
        return { ok: true, result: normalizeResult(data as Record<string, unknown>) };
      }
      lastError = "Parsed value is not a JSON object.";
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  return {
    ok: false,
    error: `Could not parse model response as JSON (${lastError}).`,
    rawText: text,
  };
}

function normalizeResult(data: Record<string, unknown>): AnalysisResult {
  const result: AnalysisResult = {};

  if (typeof data.explanation === "string") {
    result.explanation = data.explanation;
  }

  if (data.bug_fixes && typeof data.bug_fixes === "object" && data.bug_fixes !== null) {
    const bf = data.bug_fixes as Record<string, unknown>;
    const issues = Array.isArray(bf.issues)
      ? bf.issues.map((x) => String(x))
      : [];
    result.bug_fixes = {
      summary: typeof bf.summary === "string" ? bf.summary : "",
      issues,
      fixed_code: typeof bf.fixed_code === "string" ? bf.fixed_code : "",
    } satisfies BugFixes;
  }

  if (data.tests && typeof data.tests === "object" && data.tests !== null) {
    const t = data.tests as Record<string, unknown>;
    result.tests = {
      framework: typeof t.framework === "string" ? t.framework : "unknown",
      code: typeof t.code === "string" ? t.code : "",
    } satisfies TestsResult;
  }

  if (Array.isArray(data.improvements)) {
    result.improvements = data.improvements.map((x) => String(x));
  }

  return result;
}
