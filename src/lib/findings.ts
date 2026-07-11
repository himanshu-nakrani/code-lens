/**
 * Helpers for structured findings — normalize, collect, sort.
 * Shared by parse, UI, scorecard, and export.
 */

import type { AnalysisResult, Finding, Severity } from "./types";
import { severityRank } from "./types";

const SEVERITIES: Severity[] = ["critical", "high", "medium", "low", "info"];

export function isSeverity(v: unknown): v is Severity {
  return typeof v === "string" && SEVERITIES.includes(v as Severity);
}

export function normalizeSeverity(v: unknown, fallback: Severity = "medium"): Severity {
  if (typeof v !== "string") return fallback;
  const s = v.toLowerCase().trim() as Severity;
  return isSeverity(s) ? s : fallback;
}

/** Coerce a model object (or bare string) into a Finding. */
export function normalizeFinding(raw: unknown, index = 0): Finding {
  if (typeof raw === "string") {
    return {
      title: raw.slice(0, 120) || `Finding ${index + 1}`,
      detail: raw,
      severity: "medium",
    };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      title: `Finding ${index + 1}`,
      detail: String(raw ?? ""),
      severity: "medium",
    };
  }
  const o = raw as Record<string, unknown>;
  const title =
    typeof o.title === "string" && o.title.trim()
      ? o.title.trim()
      : typeof o.summary === "string" && o.summary.trim()
        ? o.summary.trim()
        : typeof o.message === "string" && o.message.trim()
          ? o.message.trim()
          : `Finding ${index + 1}`;
  const detail =
    typeof o.detail === "string"
      ? o.detail
      : typeof o.description === "string"
        ? o.description
        : typeof o.why === "string"
          ? o.why
          : title;
  const line =
    typeof o.line === "number" && Number.isFinite(o.line) && o.line > 0
      ? Math.floor(o.line)
      : typeof o.line === "string" && /^\d+$/.test(o.line)
        ? parseInt(o.line, 10)
        : undefined;
  const endLine =
    typeof o.endLine === "number" && Number.isFinite(o.endLine) && o.endLine > 0
      ? Math.floor(o.endLine)
      : typeof o.end_line === "number" && Number.isFinite(o.end_line)
        ? Math.floor(o.end_line as number)
        : undefined;

  return {
    title,
    detail,
    severity: normalizeSeverity(o.severity),
    line,
    endLine: endLine && line && endLine >= line ? endLine : undefined,
    category: typeof o.category === "string" ? o.category : undefined,
    suggestion: typeof o.suggestion === "string" ? o.suggestion : undefined,
    ruleId:
      typeof o.ruleId === "string"
        ? o.ruleId
        : typeof o.rule_id === "string"
          ? o.rule_id
          : typeof o.cwe === "string"
            ? o.cwe
            : undefined,
  };
}

export function normalizeFindings(raw: unknown): Finding[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => normalizeFinding(item, i));
}

/** Flatten every structured finding from an analysis result for annotations. */
export function collectAllFindings(result: AnalysisResult | null | undefined): Finding[] {
  if (!result) return [];
  const out: Finding[] = [];

  if (result.bug_fixes?.structured_issues?.length) {
    out.push(...result.bug_fixes.structured_issues);
  } else if (result.bug_fixes?.issues?.length) {
    out.push(...result.bug_fixes.issues.map((s, i) => normalizeFinding(s, i)));
  }
  if (result.security?.findings?.length) {
    out.push(...result.security.findings);
  }
  if (result.architecture?.hotspots?.length) {
    out.push(...result.architecture.hotspots);
  }
  return out;
}

export function findingsWithLines(findings: Finding[]): Finding[] {
  return findings.filter((f) => typeof f.line === "number" && f.line > 0);
}

export function sortBySeverity(findings: Finding[]): Finding[] {
  return [...findings].sort(
    (a, b) => severityRank(a.severity) - severityRank(b.severity)
  );
}

export function countBySeverity(findings: Finding[]): Record<Severity, number> {
  const counts: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
  for (const f of findings) {
    counts[f.severity] = (counts[f.severity] ?? 0) + 1;
  }
  return counts;
}

export function worstSeverity(findings: Finding[]): Severity | null {
  if (!findings.length) return null;
  return sortBySeverity(findings)[0].severity;
}
