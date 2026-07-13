import { describe, expect, it, beforeEach } from "vitest";
import {
  clearPersistedHistory,
  loadPersistedHistory,
  savePersistedHistory,
} from "./history-store";
import { buildHistoryEntry } from "./history";

/** Minimal localStorage for Node vitest. */
function installMemoryStorage() {
  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, String(v));
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => map.clear(),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    get length() {
      return map.size;
    },
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
    writable: true,
  });
}

describe("history-store", () => {
  beforeEach(() => {
    installMemoryStorage();
    clearPersistedHistory();
  });

  it("round-trips slim history entries", () => {
    const entry = buildHistoryEntry({
      target: "app.js",
      tasks: ["fix_bugs"],
      durationMs: 900,
      depth: "standard",
      result: {
        bug_fixes: {
          summary: "ok",
          issues: [],
          structured_issues: [
            { title: "x", detail: "y", severity: "low", line: 1 },
          ],
          fixed_code: "const x = 1;",
        },
      },
      at: 42,
    });
    savePersistedHistory([entry]);
    const loaded = loadPersistedHistory();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].target).toBe("app.js");
    expect(loaded[0].score).toBe(entry.score);
    expect(loaded[0].findingCount).toBe(1);
  });

  it("returns empty for corrupt storage", () => {
    localStorage.setItem("code-lens-history-v1", "{not-json");
    expect(loadPersistedHistory()).toEqual([]);
  });
});
