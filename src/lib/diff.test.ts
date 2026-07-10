import { describe, expect, it } from "vitest";
import { countDiffStats, diffLines } from "./diff";

describe("diffLines / countDiffStats (shipped)", () => {
  it("marks identical files as all same", () => {
    const lines = diffLines("a\nb\nc", "a\nb\nc");
    expect(lines.every((l) => l.type === "same")).toBe(true);
    expect(countDiffStats(lines)).toEqual({ added: 0, removed: 0 });
  });

  it("detects added and removed lines", () => {
    const before = "keep\nold\nend";
    const after = "keep\nnew\nend";
    const lines = diffLines(before, after);
    const stats = countDiffStats(lines);
    expect(stats.removed).toBeGreaterThanOrEqual(1);
    expect(stats.added).toBeGreaterThanOrEqual(1);
    expect(lines.some((l) => l.type === "del" && l.text === "old")).toBe(true);
    expect(lines.some((l) => l.type === "add" && l.text === "new")).toBe(true);
  });

  it("handles pure insertion", () => {
    const lines = diffLines("a", "a\nb");
    const stats = countDiffStats(lines);
    expect(stats.added).toBe(1);
    expect(stats.removed).toBe(0);
  });
});
