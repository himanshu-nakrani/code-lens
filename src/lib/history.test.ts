import { describe, expect, it } from "vitest";
import { buildHistoryEntry, prependHistory, resultToSarif } from "./history";

describe("buildHistoryEntry / prependHistory", () => {
  it("counts findings and prepends newest first", () => {
    const result = {
      bug_fixes: {
        summary: "x",
        issues: ["a"],
        structured_issues: [
          { title: "bug", detail: "d", severity: "high" as const, line: 3 },
        ],
        fixed_code: "",
      },
      security: {
        summary: "s",
        risk_level: "medium" as const,
        findings: [
          { title: "sec", detail: "d", severity: "critical" as const, line: 1 },
        ],
      },
    };
    const entry = buildHistoryEntry({
      target: "a.js",
      tasks: ["fix_bugs", "security_audit"],
      durationMs: 1200,
      depth: "deep",
      focusNote: "auth",
      result,
      at: 100,
    });
    expect(entry.findingCount).toBe(2);
    expect(entry.worstSeverity).toBe("critical");
    expect(entry.focusNote).toBe("auth");
    expect(entry.depth).toBe("deep");
    expect(typeof entry.score).toBe("number");
    expect(entry.grade).toMatch(/^[A-F]$/);

    const list = prependHistory(
      [entry],
      buildHistoryEntry({
        target: "b.js",
        tasks: ["explain"],
        durationMs: 500,
        depth: "standard",
        result: { explanation: "ok" },
        at: 200,
      })
    );
    expect(list[0].target).toBe("b.js");
    expect(list).toHaveLength(2);
  });
});

describe("resultToSarif", () => {
  it("emits SARIF 2.1 with locations for lined findings", () => {
    const sarif = resultToSarif(
      {
        security: {
          summary: "risk",
          risk_level: "high",
          findings: [
            {
              title: "SQL injection",
              detail: "concat",
              severity: "critical",
              line: 8,
              ruleId: "CWE-89",
            },
          ],
        },
      },
      { target: "samples/userLookup.js" }
    ) as {
      version: string;
      runs: Array<{
        results: Array<{
          ruleId: string;
          level: string;
          locations?: Array<{ physicalLocation: { region: { startLine: number } } }>;
        }>;
      }>;
    };
    expect(sarif.version).toBe("2.1.0");
    expect(sarif.runs[0].results).toHaveLength(1);
    expect(sarif.runs[0].results[0].ruleId).toBe("CWE-89");
    expect(sarif.runs[0].results[0].level).toBe("error");
    expect(sarif.runs[0].results[0].locations?.[0].physicalLocation.region.startLine).toBe(8);
  });
});
