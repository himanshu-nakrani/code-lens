/**
 * Persist analysis run history across reloads (slim entries).
 */

import type { AnalysisHistoryEntry } from "./types";
import { MAX_HISTORY } from "./history";

const KEY = "code-lens-history-v1";
const MAX_BYTES = 350_000;

export function loadPersistedHistory(): AnalysisHistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as AnalysisHistoryEntry[];
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((e) => e && typeof e.id === "number" && e.result)
      .slice(0, MAX_HISTORY);
  } catch {
    return [];
  }
}

export function savePersistedHistory(entries: AnalysisHistoryEntry[]): void {
  try {
    // Slim: drop huge fixed_code / tests if payload too large
    let payload = entries.slice(0, MAX_HISTORY);
    let json = JSON.stringify(payload);
    if (json.length > MAX_BYTES) {
      payload = payload.map((e) => ({
        ...e,
        result: {
          ...e.result,
          bug_fixes: e.result.bug_fixes
            ? {
                ...e.result.bug_fixes,
                fixed_code:
                  e.result.bug_fixes.fixed_code?.length > 8000
                    ? e.result.bug_fixes.fixed_code.slice(0, 8000) +
                      "\n/* truncated for storage */"
                    : e.result.bug_fixes.fixed_code,
              }
            : undefined,
          tests: e.result.tests
            ? {
                ...e.result.tests,
                code:
                  e.result.tests.code?.length > 8000
                    ? e.result.tests.code.slice(0, 8000) +
                      "\n/* truncated for storage */"
                    : e.result.tests.code,
              }
            : undefined,
        },
      }));
      json = JSON.stringify(payload);
    }
    if (json.length > MAX_BYTES) {
      // Last resort: keep metadata + explanation only
      payload = payload.map((e) => ({
        ...e,
        result: {
          explanation: e.result.explanation?.slice(0, 2000),
          quality: e.result.quality,
        },
      }));
      json = JSON.stringify(payload);
    }
    localStorage.setItem(KEY, json);
  } catch {
    /* quota */
  }
}

export function clearPersistedHistory(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
