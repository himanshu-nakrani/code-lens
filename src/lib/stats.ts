/** Lightweight client-side source stats + multi-axis scorecard. */

import type { AnalysisResult, QualityDimensions, Severity } from "./types";
import {
  collectAllFindings,
  countBySeverity,
  worstSeverity,
} from "./findings";

export interface CodeStats {
  lines: number;
  blank: number;
  code: number;
  comments: number;
  functions: number;
  todos: number;
  complexityHint: "low" | "medium" | "high";
  branches: number;
}

export function analyzeSource(content: string, language: string): CodeStats {
  const lines = content.split("\n");
  let blank = 0;
  let comments = 0;
  let code = 0;
  let todos = 0;

  const commentRe =
    language === "python"
      ? /^\s*#/
      : /^\s*(\/\/|\/\*|\*|#)/;

  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      blank++;
      continue;
    }
    if (/TODO|FIXME|HACK|XXX/i.test(t)) todos++;
    if (commentRe.test(t)) comments++;
    else code++;
  }

  // Rough function count
  let functions = 0;
  if (language === "python") {
    functions = (content.match(/^\s*def\s+\w+/gm) || []).length;
  } else {
    functions = (
      content.match(
        /(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?\(|(?:async\s+)?(?:export\s+)?function\s+\w+|^\s*(?:export\s+)?(?:async\s+)?\w+\s*\([^)]*\)\s*\{)/gm
      ) || []
    ).length;
  }

  // Heuristic complexity from branching keywords
  const branches = (content.match(/\b(if|else|for|while|switch|case|catch|&&|\|\|)\b/g) || [])
    .length;
  const complexityHint: CodeStats["complexityHint"] =
    branches > 25 ? "high" : branches > 10 ? "medium" : "low";

  return {
    lines: lines.length,
    blank,
    code,
    comments,
    functions,
    todos,
    complexityHint,
    branches,
  };
}

export type Scorecard = {
  score: number;
  grade: string;
  notes: string[];
  dimensions: Required<QualityDimensions>;
  severityCounts: Record<Severity, number>;
  worst: Severity | null;
};

function gradeFromScore(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Build multi-axis scorecard from analysis result + local source stats.
 * Prefer model quality scores when present; fill gaps with heuristics.
 */
export function buildScorecard(
  stats: CodeStats | null,
  result: AnalysisResult | null
): Scorecard {
  if (!result) {
    return {
      score: 0,
      grade: "—",
      notes: [],
      dimensions: {
        correctness: 0,
        security: 0,
        maintainability: 0,
        testability: 0,
        complexity: 0,
      },
      severityCounts: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
      },
      worst: null,
    };
  }

  const findings = collectAllFindings(result);
  const severityCounts = countBySeverity(findings);
  const worst = worstSeverity(findings);
  const notes: string[] = [];
  const mq = result.quality;

  // --- Correctness ---
  let correctness = mq?.correctness ?? 78;
  const bugCount =
    result.bug_fixes?.structured_issues?.length ??
    result.bug_fixes?.issues?.length ??
    0;
  if (mq?.correctness == null) {
    if (result.bug_fixes) {
      if (bugCount === 0) {
        correctness += 14;
        notes.push("No bugs flagged");
      } else {
        correctness -= Math.min(40, bugCount * 10 + severityCounts.critical * 8 + severityCounts.high * 4);
        notes.push(`${bugCount} bug${bugCount === 1 ? "" : "s"} found`);
      }
    }
    if (result.bug_fixes?.fixed_code) {
      correctness += 3;
      notes.push("Fix available");
    }
  } else if (bugCount > 0) {
    notes.push(`${bugCount} bug${bugCount === 1 ? "" : "s"} found`);
  }

  // --- Security ---
  let security = mq?.security ?? 80;
  if (mq?.security == null && result.security) {
    const secFindings = result.security.findings ?? [];
    const base =
      result.security.risk_level === "critical"
        ? 28
        : result.security.risk_level === "high"
          ? 45
          : result.security.risk_level === "medium"
            ? 62
            : result.security.risk_level === "low"
              ? 78
              : 88;
    security = base - Math.min(30, secFindings.length * 5);
    notes.push(
      secFindings.length
        ? `${secFindings.length} security finding${secFindings.length === 1 ? "" : "s"}`
        : "Security clear"
    );
  } else if (result.security?.findings?.length) {
    notes.push(`${result.security.findings.length} security findings`);
  }

  // --- Maintainability ---
  let maintainability = mq?.maintainability ?? 74;
  if (mq?.maintainability == null) {
    const tips = result.improvements?.length ?? 0;
    if (tips > 0) {
      maintainability -= Math.min(18, tips * 2);
      notes.push(`${tips} improvements`);
    }
    if (result.architecture) {
      if (result.architecture.coupling === "high") maintainability -= 10;
      if (result.architecture.coupling === "low") maintainability += 6;
      if (result.architecture.cohesion === "high") maintainability += 6;
      if (result.architecture.cohesion === "low") maintainability -= 8;
      if (result.architecture.hotspots?.length) {
        maintainability -= Math.min(12, result.architecture.hotspots.length * 3);
        notes.push(`${result.architecture.hotspots.length} arch hotspots`);
      }
    }
    if (stats?.todos) {
      maintainability -= Math.min(10, stats.todos * 3);
      notes.push(`${stats.todos} TODO/FIXME`);
    }
  }

  // --- Testability ---
  let testability = mq?.testability ?? 70;
  if (mq?.testability == null) {
    if (result.tests?.code) {
      testability += 18;
      notes.push("Tests generated");
      if (result.tests.coverage_notes?.length) {
        testability += 4;
      }
    } else if (result.tests) {
      testability -= 5;
    }
  } else if (result.tests?.code) {
    notes.push("Tests generated");
  }

  // --- Complexity (higher = worse; inverted for display score later) ---
  let complexity = mq?.complexity ?? 40;
  if (mq?.complexity == null) {
    if (stats?.complexityHint === "high") {
      complexity = 72;
      notes.push("High branching complexity");
    } else if (stats?.complexityHint === "medium") {
      complexity = 48;
    } else if (stats?.complexityHint === "low") {
      complexity = 22;
    }
    if (result.architecture?.coupling === "high") complexity += 12;
  }

  const dimensions: Required<QualityDimensions> = {
    correctness: clamp(correctness),
    security: clamp(security),
    maintainability: clamp(maintainability),
    testability: clamp(testability),
    complexity: clamp(complexity),
  };

  // Overall: weight axes; invert complexity (high complexity lowers score)
  const complexityHealth = 100 - dimensions.complexity;
  const score = clamp(
    dimensions.correctness * 0.3 +
      dimensions.security * 0.25 +
      dimensions.maintainability * 0.2 +
      dimensions.testability * 0.15 +
      complexityHealth * 0.1
  );

  if (worst && (worst === "critical" || worst === "high")) {
    notes.unshift(`Worst: ${worst}`);
  }

  return {
    score,
    grade: gradeFromScore(score),
    notes: notes.slice(0, 8),
    dimensions,
    severityCounts,
    worst,
  };
}
