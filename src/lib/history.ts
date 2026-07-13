/**
 * Pure helpers for analysis run history (restorable results).
 */

import type {
  AnalysisDepth,
  AnalysisHistoryEntry,
  AnalysisResult,
  TaskId,
} from "./types";
import { collectAllFindings, worstSeverity } from "./findings";
import { buildScorecard } from "./stats";

export const MAX_HISTORY = 12;

export function buildHistoryEntry(opts: {
  target: string;
  tasks: TaskId[];
  durationMs: number;
  depth: AnalysisDepth;
  focusNote?: string;
  result: AnalysisResult;
  at?: number;
}): AnalysisHistoryEntry {
  const findings = collectAllFindings(opts.result);
  const worst = worstSeverity(findings);
  const card = buildScorecard(null, opts.result);
  return {
    id: opts.at ?? Date.now(),
    target: opts.target,
    tasks: [...opts.tasks],
    at: opts.at ?? Date.now(),
    durationMs: opts.durationMs,
    depth: opts.depth,
    focusNote: opts.focusNote?.trim() || undefined,
    result: opts.result,
    findingCount: findings.length,
    worstSeverity: worst ?? undefined,
    score: card.score,
    grade: card.grade,
  };
}

export function prependHistory(
  prev: AnalysisHistoryEntry[],
  entry: AnalysisHistoryEntry,
  max = MAX_HISTORY
): AnalysisHistoryEntry[] {
  return [entry, ...prev.filter((h) => h.id !== entry.id)].slice(0, max);
}

/** Lightweight SARIF 2.1.0 document from structured findings. */
export function resultToSarif(
  result: AnalysisResult,
  opts: { target: string; language?: string }
): object {
  const findings = collectAllFindings(result);
  const rulesMap = new Map<string, { id: string; name: string; shortDescription: { text: string } }>();
  const results: object[] = [];

  for (const f of findings) {
    const ruleId = f.ruleId || f.category || f.severity || "code-lens";
    if (!rulesMap.has(ruleId)) {
      rulesMap.set(ruleId, {
        id: ruleId,
        name: ruleId,
        shortDescription: { text: f.title || ruleId },
      });
    }
    const level =
      f.severity === "critical" || f.severity === "high"
        ? "error"
        : f.severity === "medium"
          ? "warning"
          : "note";
    const res: Record<string, unknown> = {
      ruleId,
      level,
      message: {
        text: [f.title, f.detail, f.suggestion].filter(Boolean).join(" — "),
      },
    };
    if (typeof f.line === "number" && f.line > 0) {
      res.locations = [
        {
          physicalLocation: {
            artifactLocation: { uri: opts.target },
            region: {
              startLine: f.line,
              endLine: f.endLine && f.endLine >= f.line ? f.endLine : f.line,
            },
          },
        },
      ];
    }
    results.push(res);
  }

  return {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "Code Lens",
            informationUri: "https://github.com/himanshu-nakrani/code-lens",
            version: "0.1.0",
            rules: Array.from(rulesMap.values()),
          },
        },
        results,
      },
    ],
  };
}
