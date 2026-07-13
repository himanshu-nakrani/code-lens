"use client";

import type { TaskId } from "@/lib/types";
import { ALL_TASKS } from "@/lib/types";

interface ReadyPanelProps {
  enabledTasks: TaskId[];
  hasFiles: boolean;
  onAnalyze?: () => void;
  onOpenSamples?: () => void;
}

/** Quiet empty results state — only armed lenses. */
export function ReadyPanel({
  enabledTasks,
  hasFiles,
  onAnalyze,
  onOpenSamples,
}: ReadyPanelProps) {
  const armed = ALL_TASKS.filter((t) => enabledTasks.includes(t.id));

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-5 py-8 text-center">
      <span className="empty-mark" aria-hidden>
        {hasFiles ? "◎" : "○"}
      </span>
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted-2)]">
          analysis
        </p>
        <p className="mt-1 text-[13px] text-[var(--fg)]">
          {hasFiles ? "Ready when you are" : "Nothing loaded"}
        </p>
        <p className="mx-auto mt-1.5 max-w-[15rem] text-[11px] leading-relaxed text-[var(--muted)]">
          {hasFiles
            ? `${armed.length || enabledTasks.length} lens${(armed.length || enabledTasks.length) === 1 ? "" : "es"} armed. Run analyze to fill this panel.`
            : "Load a sample or drop a file first."}
        </p>
      </div>

      {hasFiles && armed.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {armed.map((t) => (
            <span
              key={t.id}
              className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[10px] text-[var(--muted)]"
            >
              {t.shortLabel}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        {hasFiles && onAnalyze && (
          <button type="button" onClick={onAnalyze} className="btn-primary">
            analyze
          </button>
        )}
        {!hasFiles && onOpenSamples && (
          <button type="button" onClick={onOpenSamples} className="btn-secondary">
            samples
          </button>
        )}
      </div>
    </div>
  );
}
