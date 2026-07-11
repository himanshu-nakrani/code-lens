import { describe, expect, it } from "vitest";
import {
  collectAllFindings,
  normalizeFinding,
  normalizeFindings,
  sortBySeverity,
  worstSeverity,
} from "./findings";

describe("normalizeFinding", () => {
  it("coerces bare strings", () => {
    const f = normalizeFinding("off-by-one in loop");
    expect(f.title).toContain("off-by-one");
    expect(f.severity).toBe("medium");
  });

  it("parses structured objects with line numbers", () => {
    const f = normalizeFinding({
      title: "SQL injection",
      detail: "String concat builds query",
      severity: "critical",
      line: 8,
      ruleId: "CWE-89",
      suggestion: "Use parameterized queries",
    });
    expect(f.severity).toBe("critical");
    expect(f.line).toBe(8);
    expect(f.ruleId).toBe("CWE-89");
  });

  it("accepts cwe as ruleId alias", () => {
    const f = normalizeFinding({ title: "xss", cwe: "CWE-79", severity: "high" });
    expect(f.ruleId).toBe("CWE-79");
  });
});

describe("sortBySeverity / worstSeverity", () => {
  it("orders critical first", () => {
    const sorted = sortBySeverity(
      normalizeFindings([
        { title: "a", severity: "low" },
        { title: "b", severity: "critical" },
        { title: "c", severity: "medium" },
      ])
    );
    expect(sorted.map((f) => f.severity)).toEqual(["critical", "medium", "low"]);
    expect(worstSeverity(sorted)).toBe("critical");
  });
});

describe("collectAllFindings", () => {
  it("merges bugs, security, and architecture hotspots", () => {
    const all = collectAllFindings({
      bug_fixes: {
        summary: "x",
        issues: ["legacy string issue"],
        structured_issues: [
          { title: "bug", detail: "d", severity: "high", line: 2 },
        ],
        fixed_code: "",
      },
      security: {
        summary: "risky",
        risk_level: "high",
        findings: [{ title: "inj", detail: "sql", severity: "critical", line: 8 }],
      },
      architecture: {
        summary: "ok",
        coupling: "medium",
        cohesion: "high",
        hotspots: [{ title: "hot", detail: "cx", severity: "low", line: 20 }],
        recommendations: [],
      },
    });
    expect(all.length).toBe(3);
    expect(all.some((f) => f.severity === "critical")).toBe(true);
  });
});
