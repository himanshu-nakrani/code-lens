"use client";

import type { TaskId } from "@/lib/types";
import { ALL_TASKS } from "@/lib/types";

interface FocusHUDProps {
  target: string;
  language: string;
  enabledTasks: TaskId[];
  loading: boolean;
  hasResult: boolean;
  lineCount: number;
}

/** Compact live focus readout under the toolbar. */
export function FocusHUD({
  target,
  language,
  enabledTasks,
  loading,
  hasResult,
  lineCount,
}: FocusHUDProps) {
  if (!target) return null;

  return (
    <div className="focus-hud shrink-0 border-b border-[var(--border)] bg-[var(--bg)] px-3 py-1.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px]">
        <span className="inline-flex items-center gap-1.5 text-[var(--muted-2)]">
          <span className={`signal-bars ${loading ? "signal-live" : hasResult ? "" : ""}`}>
            <span />
            <span />
            <span />
            <span />
          </span>
          FOCUS
        </span>
        <span className="max-w-[40%] truncate text-[var(--fg)]" title={target}>
          {target}
        </span>
        {language && language !== "text" && (
          <span className="text-[var(--accent)]">{language}</span>
        )}
        {lineCount > 0 && (
          <span className="text-[var(--muted-2)]">{lineCount}L</span>
        )}
        <span className="hidden items-center gap-1 sm:inline-flex">
          {ALL_TASKS.map((t) => {
            const on = enabledTasks.includes(t.id);
            return (
              <span
                key={t.id}
                className={`hud-lens ${on ? "hud-lens-on" : ""}`}
                title={t.label}
              />
            );
          })}
        </span>
        <span
          className={`ml-auto uppercase tracking-wider ${
            loading
              ? "text-[var(--accent)]"
              : hasResult
                ? "text-[var(--ok)]"
                : "text-[var(--muted-2)]"
          }`}
        >
          {loading ? "● focusing" : hasResult ? "● locked" : "○ standby"}
        </span>
      </div>
    </div>
  );
}
