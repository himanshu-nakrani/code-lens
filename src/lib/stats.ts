/** Lightweight client-side source stats for the status bar / scorecard. */

export interface CodeStats {
  lines: number;
  blank: number;
  code: number;
  comments: number;
  functions: number;
  todos: number;
  complexityHint: "low" | "medium" | "high";
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
  };
}

/** Demo scorecard from analysis result + source stats (not model-scored). */
export function buildScorecard(
  stats: CodeStats | null,
  result: {
    bug_fixes?: { issues?: string[]; fixed_code?: string };
    tests?: { code?: string };
    improvements?: string[];
    explanation?: string;
  } | null
): {
  score: number;
  grade: string;
  notes: string[];
} {
  if (!result) return { score: 0, grade: "—", notes: [] };

  let score = 72;
  const notes: string[] = [];

  const issues = result.bug_fixes?.issues?.length ?? 0;
  if (issues === 0 && result.bug_fixes) {
    score += 12;
    notes.push("No bugs flagged");
  } else if (issues > 0) {
    score -= Math.min(28, issues * 8);
    notes.push(`${issues} issue${issues === 1 ? "" : "s"} found`);
  }

  if (result.bug_fixes?.fixed_code) {
    score += 4;
    notes.push("Fix available");
  }
  if (result.tests?.code) {
    score += 8;
    notes.push("Tests generated");
  }
  if ((result.improvements?.length ?? 0) > 0) {
    notes.push(`${result.improvements!.length} improvements`);
  }
  if (stats?.todos) {
    score -= Math.min(10, stats.todos * 3);
    notes.push(`${stats.todos} TODO/FIXME`);
  }
  if (stats?.complexityHint === "high") {
    score -= 6;
    notes.push("High branching complexity");
  } else if (stats?.complexityHint === "low") {
    score += 3;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const grade =
    score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";

  return { score, grade, notes };
}
