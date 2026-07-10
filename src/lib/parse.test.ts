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
});
