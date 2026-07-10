/** Minimal line-level diff for demo UI (not a full Myers algorithm). */

export type DiffLine = {
  type: "same" | "add" | "del";
  text: string;
  leftNo?: number;
  rightNo?: number;
};

/**
 * Greedy LCS-based line diff — good enough for short source files in a demo.
 */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const n = a.length;
  const m = b.length;

  // DP LCS lengths
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    Array<number>(m + 1).fill(0)
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  let leftNo = 1;
  let rightNo = 1;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: "same", text: a[i], leftNo: leftNo++, rightNo: rightNo++ });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: "del", text: a[i], leftNo: leftNo++ });
      i++;
    } else {
      out.push({ type: "add", text: b[j], rightNo: rightNo++ });
      j++;
    }
  }
  while (i < n) {
    out.push({ type: "del", text: a[i++], leftNo: leftNo++ });
  }
  while (j < m) {
    out.push({ type: "add", text: b[j++], rightNo: rightNo++ });
  }
  return out;
}

export function countDiffStats(lines: DiffLine[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const l of lines) {
    if (l.type === "add") added++;
    if (l.type === "del") removed++;
  }
  return { added, removed };
}
