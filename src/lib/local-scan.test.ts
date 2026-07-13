import { describe, expect, it } from "vitest";
import { localScan, localScanFiles } from "./local-scan";

describe("localScan", () => {
  it("flags TODO markers", () => {
    const f = localScan("const x = 1; // TODO fix later\n", "javascript");
    expect(f.some((x) => x.ruleId === "local/todo")).toBe(true);
  });

  it("flags empty catch", () => {
    const f = localScan("try { a(); } catch (e) {}\n", "javascript");
    expect(f.some((x) => x.ruleId === "local/empty-catch" && x.severity === "high")).toBe(
      true
    );
  });

  it("flags eval", () => {
    const f = localScan('eval("1+1")\n', "javascript");
    expect(f.some((x) => x.ruleId === "local/eval")).toBe(true);
  });

  it("flags SQL concatenation style", () => {
    const src = 'const q = "SELECT * FROM users WHERE id = " + id;\n';
    const f = localScan(src, "javascript");
    expect(f.some((x) => x.ruleId === "local/sql-concat")).toBe(true);
  });

  it("flags Python bare except and div by len", () => {
    const src = `def avg(xs):\n    try:\n        return sum(xs) / len(xs)\n    except:\n        pass\n`;
    const f = localScan(src, "python");
    expect(f.some((x) => x.ruleId === "local/div-len")).toBe(true);
    expect(f.some((x) => x.ruleId === "local/bare-except")).toBe(true);
  });

  it("scans selected file only when path set", () => {
    const files = [
      { path: "a.js", content: "eval(1)", language: "javascript" },
      { path: "b.js", content: "const x = 1", language: "javascript" },
    ];
    const f = localScanFiles(files, "b.js");
    expect(f.some((x) => x.ruleId === "local/eval")).toBe(false);
  });
});
