"use client";

import type { TaskId } from "@/lib/types";
import { ALL_TASKS } from "@/lib/types";

interface ReadyPanelProps {
  enabledTasks: TaskId[];
  hasFiles: boolean;
  onAnalyze?: () => void;
  onOpenSamples?: () => void;
}

/** Engaging empty results state with live task preview. */
export function ReadyPanel({
  enabledTasks,
  hasFiles,
  onAnalyze,
  onOpenSamples,
}: ReadyPanelProps) {
  const n = ALL_TASKS.length;
  const step = 360 / n;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-5 py-8 text-center">
      <div className="ready-dial" aria-hidden>
        {ALL_TASKS.map((t, i) => {
          const on = enabledTasks.includes(t.id);
          const angle = -90 + i * step;
          return (
            <span
              key={t.id}
              className={`ready-tick ${on ? "ready-tick-on" : ""}`}
              style={{ transform: `rotate(${angle}deg) translateY(-28px)` }}
              title={t.label}
            />
          );
        })}
        <span className="ready-dial-core font-mono text-[10px] text-[var(--accent)]">
          {enabledTasks.length}/{n}
        </span>
      </div>

      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted-2)]">
          output idle
        </p>
        <p className="mt-1 text-[13px] text-[var(--fg)]">
          {hasFiles ? "Ready to focus" : "Load source to begin"}
        </p>
        <p className="mx-auto mt-1.5 max-w-[16rem] text-[11px] leading-relaxed text-[var(--muted)]">
          {hasFiles
            ? "Lenses selected below — bugs, security, architecture, tests. Hit analyze."
            : "Drop a file or run a sample — advanced findings appear here."}
        </p>
      </div>

      <div className="flex w-full max-w-[14rem] flex-col gap-1">
        {ALL_TASKS.map((t) => {
          const on = enabledTasks.includes(t.id);
          return (
            <div
              key={t.id}
              className={`flex items-center justify-between border px-2 py-1 font-mono text-[10px] ${
                on
                  ? "border-[var(--accent-border)] bg-[var(--accent-dim)] text-[var(--accent)]"
                  : "border-[var(--border)] text-[var(--muted-2)]"
              }`}
            >
              <span>{t.label}</span>
              <span>{on ? "armed" : "off"}</span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {hasFiles && onAnalyze && (
          <button type="button" onClick={onAnalyze} className="btn-primary">
            focus analyze
          </button>
        )}
        {!hasFiles && onOpenSamples && (
          <button type="button" onClick={onOpenSamples} className="btn-secondary">
            view samples
          </button>
        )}
      </div>
    </div>
  );
}
