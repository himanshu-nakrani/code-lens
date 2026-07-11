import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const root = path.resolve(__dirname, "../..");

function walk(dir: string, acc: string[] = []): string[] {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx|js|jsx)$/.test(ent.name) && !ent.name.includes(".test.")) {
      acc.push(p);
    }
  }
  return acc;
}

describe("security boundary (static, shipped tree)", () => {
  it("client components never import server-only helpers", () => {
    const componentsDir = path.join(root, "src/components");
    const files = walk(componentsDir);
    expect(files.length).toBeGreaterThan(0);
    const forbidden = [
      /from\s+["']@\/lib\/grok["']/,
      /from\s+["']\.\.\/lib\/grok["']/,
      /from\s+["']@\/lib\/github-fetch["']/,
      /from\s+["']\.\.\/lib\/github-fetch["']/,
    ];
    const offenders: string[] = [];
    for (const f of files) {
      const text = fs.readFileSync(f, "utf8");
      if (forbidden.some((re) => re.test(text))) {
        offenders.push(path.relative(root, f));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("server helpers are marked server-only", () => {
    const grok = fs.readFileSync(path.join(root, "src/lib/grok.ts"), "utf8");
    expect(grok).toMatch(/import\s+["']server-only["']/);
    const gh = fs.readFileSync(path.join(root, "src/lib/github-fetch.ts"), "utf8");
    expect(gh).toMatch(/import\s+["']server-only["']/);
  });
});
