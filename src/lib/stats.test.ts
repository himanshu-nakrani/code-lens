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
      bug_fixes: { summary: "", issues: [], fixed_code: "ok" },
      tests: { framework: "jest", code: "test()" },
    });
    const buggy = buildScorecard(null, {
      bug_fixes: {
        summary: "bad",
        issues: ["bug1", "bug2", "bug3"],
        fixed_code: "fixed",
      },
    });
    expect(clean.score).toBeGreaterThan(buggy.score);
    expect(buggy.notes.some((n) => /bug/i.test(n))).toBe(true);
  });

  it("includes multi-axis dimensions and severity counts", () => {
    const card = buildScorecard(null, {
      security: {
        summary: "risk",
        risk_level: "high",
        findings: [
          { title: "inj", detail: "sql", severity: "critical", line: 1 },
          { title: "xss", detail: "html", severity: "medium", line: 2 },
        ],
      },
      quality: {
        correctness: 80,
        security: 25,
        maintainability: 70,
        testability: 60,
        complexity: 40,
      },
    });
    expect(card.dimensions.security).toBe(25);
    expect(card.severityCounts.critical).toBe(1);
    expect(card.worst).toBe("critical");
    expect(card.grade).toMatch(/^[A-F]$/);
  });
});
