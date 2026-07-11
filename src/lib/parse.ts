import type {
  AnalysisResult,
  ArchitectureReview,
  BugFixes,
  QualityDimensions,
  SecurityAudit,
  TestsResult,
} from "./types";
import { normalizeFinding, normalizeFindings, normalizeSeverity } from "./findings";

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

function clampScore(n: unknown): number | undefined {
  if (typeof n !== "number" || !Number.isFinite(n)) return undefined;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeQuality(raw: unknown): QualityDimensions | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const q: QualityDimensions = {};
  const c = clampScore(o.correctness);
  const s = clampScore(o.security);
  const m = clampScore(o.maintainability);
  const t = clampScore(o.testability);
  const x = clampScore(o.complexity);
  if (c != null) q.correctness = c;
  if (s != null) q.security = s;
  if (m != null) q.maintainability = m;
  if (t != null) q.testability = t;
  if (x != null) q.complexity = x;
  return Object.keys(q).length ? q : undefined;
}

function normalizeResult(data: Record<string, unknown>): AnalysisResult {
  const result: AnalysisResult = {};

  if (typeof data.explanation === "string") {
    result.explanation = data.explanation;
  }

  if (data.bug_fixes && typeof data.bug_fixes === "object" && data.bug_fixes !== null) {
    const bf = data.bug_fixes as Record<string, unknown>;
    const structured =
      Array.isArray(bf.structured_issues)
        ? normalizeFindings(bf.structured_issues)
        : Array.isArray(bf.issues)
          ? bf.issues.map((item, i) =>
              typeof item === "object" && item !== null
                ? normalizeFinding(item, i)
                : normalizeFinding(item, i)
            )
          : [];

    // Keep string issues for export/UI fallback
    const issues = Array.isArray(bf.issues)
      ? bf.issues.map((x) =>
          typeof x === "string"
            ? x
            : typeof x === "object" && x !== null
              ? (x as FindingLike).title ||
                (x as FindingLike).detail ||
                JSON.stringify(x)
              : String(x)
        )
      : structured.map((f) => f.title + (f.detail && f.detail !== f.title ? `: ${f.detail}` : ""));

    result.bug_fixes = {
      summary: typeof bf.summary === "string" ? bf.summary : "",
      issues,
      structured_issues: structured.length ? structured : undefined,
      fixed_code: typeof bf.fixed_code === "string" ? bf.fixed_code : "",
    } satisfies BugFixes;
  }

  if (data.tests && typeof data.tests === "object" && data.tests !== null) {
    const t = data.tests as Record<string, unknown>;
    const notes = Array.isArray(t.coverage_notes)
      ? t.coverage_notes.map((x) => String(x))
      : undefined;
    result.tests = {
      framework: typeof t.framework === "string" ? t.framework : "unknown",
      code: typeof t.code === "string" ? t.code : "",
      coverage_notes: notes?.length ? notes : undefined,
    } satisfies TestsResult;
  }

  if (Array.isArray(data.improvements)) {
    result.improvements = data.improvements.map((x) => {
      if (typeof x === "string") return x;
      if (x && typeof x === "object") {
        const o = x as Record<string, unknown>;
        const title = typeof o.title === "string" ? o.title : "";
        const detail = typeof o.detail === "string" ? o.detail : "";
        if (title && detail) return `${title}: ${detail}`;
        return title || detail || String(x);
      }
      return String(x);
    });
  }

  // security or security_audit key
  const secRaw = data.security ?? data.security_audit;
  if (secRaw && typeof secRaw === "object" && secRaw !== null) {
    const s = secRaw as Record<string, unknown>;
    const findings = normalizeFindings(s.findings);
    result.security = {
      summary: typeof s.summary === "string" ? s.summary : "",
      risk_level: normalizeSeverity(s.risk_level, findings.length ? "medium" : "info"),
      findings,
    } satisfies SecurityAudit;
  }

  if (data.architecture && typeof data.architecture === "object" && data.architecture !== null) {
    const a = data.architecture as Record<string, unknown>;
    const level = (v: unknown): "low" | "medium" | "high" => {
      if (v === "low" || v === "medium" || v === "high") return v;
      return "medium";
    };
    result.architecture = {
      summary: typeof a.summary === "string" ? a.summary : "",
      coupling: level(a.coupling),
      cohesion: level(a.cohesion),
      hotspots: normalizeFindings(a.hotspots),
      recommendations: Array.isArray(a.recommendations)
        ? a.recommendations.map((x) => String(x))
        : [],
    } satisfies ArchitectureReview;
  }

  const quality = normalizeQuality(data.quality);
  if (quality) result.quality = quality;

  return result;
}

type FindingLike = { title?: string; detail?: string };
