import { describe, expect, it } from "vitest";
import {
  MAX_FILE_BYTES,
  formatBytes,
  ingestFiles,
  isLikelyBinaryContent,
} from "./files";

function makeFile(
  name: string,
  content: string,
  opts?: { type?: string; lastModified?: number }
): File {
  return new File([content], name, {
    type: opts?.type ?? "text/plain",
    lastModified: opts?.lastModified ?? 1,
  });
}

describe("ingestFiles (shipped)", () => {
  it("accepts a normal JS source file and detects language", async () => {
    const f = makeFile("sum.js", "function sum(a,b){return a+b}");
    const res = await ingestFiles([f]);
    expect(res.files).toHaveLength(1);
    expect(res.files[0].language).toBe("javascript");
    expect(res.files[0].content).toContain("function sum");
    expect(res.skipped).toHaveLength(0);
  });

  it("skips binary extensions with a user-visible reason", async () => {
    const f = makeFile("photo.png", "not really a png");
    const res = await ingestFiles([f]);
    expect(res.files).toHaveLength(0);
    expect(res.skipped.length).toBeGreaterThan(0);
    expect(res.skipped[0]).toMatch(/binary|unsupported/i);
  });

  it("skips content with NUL bytes as binary", async () => {
    const f = makeFile("blob.txt", "hello\u0000world");
    const res = await ingestFiles([f]);
    expect(res.files).toHaveLength(0);
    expect(res.skipped.some((s) => /binary/i.test(s))).toBe(true);
  });

  it("skips files exceeding per-file size cap with size reason", async () => {
    // File.size reflects blob bytes; build content larger than MAX_FILE_BYTES
    const huge = "x".repeat(MAX_FILE_BYTES + 50);
    const f = makeFile("big.js", huge);
    expect(f.size).toBeGreaterThan(MAX_FILE_BYTES);
    const res = await ingestFiles([f]);
    expect(res.files).toHaveLength(0);
    expect(res.skipped[0]).toMatch(/exceeds|limit/i);
  });

  it("sorts multiple accepted files by path", async () => {
    const a = makeFile("z.js", "z");
    const b = makeFile("a.js", "a");
    // Override webkitRelativePath via defineProperty for folder-style paths
    Object.defineProperty(a, "webkitRelativePath", { value: "src/z.js" });
    Object.defineProperty(b, "webkitRelativePath", { value: "src/a.js" });
    const res = await ingestFiles([a, b]);
    expect(res.files.map((f) => f.path)).toEqual(["src/a.js", "src/z.js"]);
  });
});

describe("isLikelyBinaryContent (shipped)", () => {
  it("flags NUL-containing text", () => {
    expect(isLikelyBinaryContent("a\u0000b")).toBe(true);
  });

  it("allows normal source", () => {
    expect(isLikelyBinaryContent("const x = 1;\n")).toBe(false);
  });
});

describe("formatBytes (shipped)", () => {
  it("formats bytes and KB", () => {
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(2048)).toMatch(/KB/);
  });
});
