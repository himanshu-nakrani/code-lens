import { describe, expect, it } from "vitest";
import {
  parseGitHubInput,
  pathInSubdir,
  shouldSkipGitHubPath,
  stripSubdirPrefix,
} from "./github-url";

describe("parseGitHubInput", () => {
  it("parses owner/repo shorthand", () => {
    const r = parseGitHubInput("vercel/next.js");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.owner).toBe("vercel");
    expect(r.value.repo).toBe("next.js");
    expect(r.value.htmlUrl).toBe("https://github.com/vercel/next.js");
  });

  it("parses full URL with tree branch and subdir", () => {
    const r = parseGitHubInput(
      "https://github.com/himanshu-nakrani/code-lens/tree/main/src/lib"
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.owner).toBe("himanshu-nakrani");
    expect(r.value.repo).toBe("code-lens");
    expect(r.value.ref).toBe("main");
    expect(r.value.subdir).toBe("src/lib");
  });

  it("strips .git suffix", () => {
    const r = parseGitHubInput("https://github.com/foo/bar.git");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.repo).toBe("bar");
  });

  it("rejects non-github hosts", () => {
    const r = parseGitHubInput("https://gitlab.com/foo/bar");
    expect(r.ok).toBe(false);
  });

  it("rejects empty input", () => {
    const r = parseGitHubInput("  ");
    expect(r.ok).toBe(false);
  });
});

describe("shouldSkipGitHubPath / subdir helpers", () => {
  it("skips node_modules and lockfiles", () => {
    expect(shouldSkipGitHubPath("src/node_modules/x/index.js")).toBe(true);
    expect(shouldSkipGitHubPath("package-lock.json")).toBe(true);
    expect(shouldSkipGitHubPath("src/lib/files.ts")).toBe(false);
  });

  it("filters and strips subdir", () => {
    expect(pathInSubdir("src/lib/a.ts", "src/lib")).toBe(true);
    expect(pathInSubdir("src/app/page.tsx", "src/lib")).toBe(false);
    expect(stripSubdirPrefix("src/lib/a.ts", "src/lib")).toBe("a.ts");
  });
});
