import { describe, expect, it } from "vitest";
import { parseAnalysisJson } from "./parse";

describe("parseAnalysisJson (shipped)", () => {
  it("parses strict JSON with explanation", () => {
    const raw = JSON.stringify({
      explanation: "sums a range",
      improvements: ["use reduce"],
    });
    const r = parseAnalysisJson(raw);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.explanation).toBe("sums a range");
    expect(r.result.improvements).toEqual(["use reduce"]);
  });

  it("recovers from markdown-fenced JSON", () => {
    const inner = {
      explanation: "hi",
      tests: { framework: "jest", code: "test('x', () => {})" },
    };
    const raw = "```json\n" + JSON.stringify(inner) + "\n```";
    const r = parseAnalysisJson(raw);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.tests?.framework).toBe("jest");
    expect(r.result.tests?.code).toContain("test(");
  });

  it("extracts JSON substring when prose wraps it", () => {
    const raw =
      'Here is the analysis:\n{"explanation":"ok","bug_fixes":{"summary":"none","issues":["off-by-one"],"fixed_code":"x=1"}}\nThanks!';
    const r = parseAnalysisJson(raw);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.explanation).toBe("ok");
    expect(r.result.bug_fixes?.issues).toEqual(["off-by-one"]);
    expect(r.result.bug_fixes?.fixed_code).toBe("x=1");
  });

  it("returns parse error with raw text for garbage", () => {
    const raw = "not json at all {{{";
    const r = parseAnalysisJson(raw);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.toLowerCase()).toMatch(/parse|json/);
    expect(r.rawText).toContain("not json");
  });

  it("fails on empty model text", () => {
    const r = parseAnalysisJson("   ");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/empty/i);
  });

  it("parses structured findings, security, architecture, quality", () => {
    const raw = JSON.stringify({
      explanation: "lookup helper",
      bug_fixes: {
        summary: "injection",
        issues: ["SQL injection via concat"],
        structured_issues: [
          {
            title: "SQL injection",
            detail: "User input in query string",
            severity: "critical",
            line: 8,
            ruleId: "CWE-89",
            suggestion: "Use bound parameters",
          },
        ],
        fixed_code: "const sql = 'SELECT * FROM users WHERE name = ?';",
      },
      security: {
        summary: "High risk",
        risk_level: "critical",
        findings: [
          {
            title: "Injection",
            detail: "concat",
            severity: "critical",
            line: 8,
            category: "injection",
          },
        ],
      },
      architecture: {
        summary: "thin module",
        coupling: "low",
        cohesion: "high",
        hotspots: [],
        recommendations: ["Add input validation layer"],
      },
      quality: {
        correctness: 40,
        security: 20,
        maintainability: 70,
        testability: 55,
        complexity: 30,
      },
    });
    const r = parseAnalysisJson(raw);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.bug_fixes?.structured_issues?.[0]?.severity).toBe("critical");
    expect(r.result.bug_fixes?.structured_issues?.[0]?.line).toBe(8);
    expect(r.result.security?.risk_level).toBe("critical");
    expect(r.result.architecture?.coupling).toBe("low");
    expect(r.result.quality?.security).toBe(20);
  });

  it("promotes object issues into structured_issues", () => {
    const raw = JSON.stringify({
      bug_fixes: {
        summary: "one",
        issues: [{ title: "null deref", severity: "high", line: 3 }],
        fixed_code: "x",
      },
    });
    const r = parseAnalysisJson(raw);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.bug_fixes?.structured_issues?.[0]?.title).toBe("null deref");
    expect(r.result.bug_fixes?.issues?.[0]).toContain("null deref");
  });
});
