import { describe, expect, it } from "vitest";
import {
  redactSecrets,
  validateAnalyzeRequest,
} from "./analyze-request";

describe("validateAnalyzeRequest (shipped)", () => {
  const goodFile = {
    name: "a.js",
    path: "a.js",
    content: "const x = 1;",
    language: "javascript",
  };

  it("rejects empty files array", () => {
    const r = validateAnalyzeRequest({ files: [], tasks: ["explain"] });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.status).toBe(400);
    expect(r.error).toMatch(/files/i);
  });

  it("rejects empty tasks", () => {
    const r = validateAnalyzeRequest({ files: [goodFile], tasks: [] });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.status).toBe(400);
    expect(r.error).toMatch(/task/i);
  });

  it("rejects invalid task ids as empty selection", () => {
    const r = validateAnalyzeRequest({
      files: [goodFile],
      tasks: ["not_a_task"],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/task/i);
  });

  it("rejects empty file content", () => {
    const r = validateAnalyzeRequest({
      files: [{ ...goodFile, content: "   " }],
      tasks: ["explain"],
      selectedPath: "a.js",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/no content/i);
  });

  it("accepts a valid body and shapes code for selected file", () => {
    const r = validateAnalyzeRequest({
      files: [goodFile],
      tasks: ["explain", "fix_bugs"],
      selectedPath: "a.js",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.tasks).toEqual(["explain", "fix_bugs"]);
    expect(r.filename).toBe("a.js");
    expect(r.language).toBe("javascript");
    expect(r.code).toContain("const x = 1");
  });

  it("includes multi-file context when other files exist", () => {
    const r = validateAnalyzeRequest({
      files: [
        goodFile,
        {
          name: "b.js",
          path: "b.js",
          content: "export const y = 2;",
          language: "javascript",
        },
      ],
      tasks: ["explain"],
      selectedPath: "a.js",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.multiFileContext).toBeDefined();
    expect(r.multiFileContext).toContain("b.js");
  });

  it("rejects non-object body", () => {
    const r = validateAnalyzeRequest(null);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.toLowerCase()).toMatch(/invalid/);
  });

  it("accepts advanced tasks and depth", () => {
    const r = validateAnalyzeRequest({
      files: [goodFile],
      tasks: ["security_audit", "architecture"],
      selectedPath: "a.js",
      depth: "deep",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.tasks).toEqual(["security_audit", "architecture"]);
    expect(r.depth).toBe("deep");
  });

  it("defaults depth to standard", () => {
    const r = validateAnalyzeRequest({
      files: [goodFile],
      tasks: ["explain"],
      selectedPath: "a.js",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.depth).toBe("standard");
  });

  it("accepts and trims focusNote", () => {
    const r = validateAnalyzeRequest({
      files: [goodFile],
      tasks: ["security_audit"],
      selectedPath: "a.js",
      focusNote: "  look for injection  ",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.focusNote).toBe("look for injection");
  });
});

describe("redactSecrets (shipped)", () => {
  it("redacts xai- style keys and bearer tokens", () => {
    const msg =
      'auth failed for xai-ABCDEFGHIJKLMNOP and Bearer supersecrettoken123';
    const out = redactSecrets(msg);
    expect(out).not.toContain("xai-ABCDEFGHIJKLMNOP");
    expect(out).toContain("[redacted]");
    expect(out.toLowerCase()).not.toContain("supersecrettoken123");
  });
});
