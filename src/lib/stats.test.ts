import { describe, expect, it } from "vitest";
import { analyzeSource, buildScorecard } from "./stats";

describe("analyzeSource (shipped)", () => {
  it("counts lines and functions in JS", () => {
    const src = `// comment
function foo() { return 1; }
const bar = () => 2;
if (true) { foo(); }
`;
    const s = analyzeSource(src, "javascript");
    expect(s.lines).toBeGreaterThan(3);
    expect(s.functions).toBeGreaterThanOrEqual(1);
    expect(["low", "medium", "high"]).toContain(s.complexityHint);
  });

  it("detects TODO markers", () => {
    const s = analyzeSource("const x = 1; // TODO fix me", "javascript");
    expect(s.todos).toBeGreaterThanOrEqual(1);
  });
});

describe("buildScorecard (shipped)", () => {
  it("lowers score when bugs are present", () => {
    const clean = buildScorecard(null, {
      bug_fixes: { issues: [], fixed_code: "ok" },
      tests: { code: "test()" },
    });
    const buggy = buildScorecard(null, {
      bug_fixes: {
        issues: ["bug1", "bug2", "bug3"],
        fixed_code: "fixed",
      },
    });
    expect(clean.score).toBeGreaterThan(buggy.score);
    expect(buggy.notes.some((n) => /issue/i.test(n))).toBe(true);
  });
});
