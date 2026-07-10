"use client";

import { ALL_TASKS, type TaskId } from "@/lib/types";

const STEPS = [
  "calibrating aperture…",
  "reading source structure…",
  "querying grok-4.5…",
  "resolving findings…",
  "assembling report…",
];

interface FocusingPanelProps {
  enabledTasks: TaskId[];
  elapsedMs: number;
  stepIdx: number;
  onCancel?: () => void;
}

export function FocusingPanel({
  enabledTasks,
  elapsedMs,
  stepIdx,
  onCancel,
}: FocusingPanelProps) {
  const sec = (elapsedMs / 1000).toFixed(1);
  const progress = Math.min(96, 12 + (elapsedMs / 1000) * 11);

  return (
    <div className="flex h-full flex-col px-4 py-6">
      <div className="flex flex-col items-center gap-3">
        <div className="focus-orb" aria-hidden>
          <div className="focus-orb-ring" />
          <div className="focus-orb-ring focus-orb-ring-delay" />
          <div className="focus-orb-core">
            <span className="font-mono text-[11px] tracking-wider text-[var(--accent)]">
              {sec}s
            </span>
          </div>
        </div>

        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted-2)]">
          focusing
        </p>
        <p className="min-h-[1.1rem] font-mono text-[12px] text-[var(--accent)]">
          {STEPS[stepIdx % STEPS.length]}
        </p>
        <p className="font-mono text-[10px] text-[var(--muted-2)]">
          {enabledTasks.length} lens{enabledTasks.length === 1 ? "" : "es"} · grok-4.5
        </p>

        <div className="mt-1 h-1 w-full max-w-[220px] overflow-hidden bg-[var(--border)]">
          <div
            className="h-full bg-[var(--accent)] transition-all duration-500"
            style={{
              width: `${progress}%`,
              boxShadow: "0 0 12px var(--accent-glow)",
            }}
          />
        </div>

        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary mt-2">
            abort
          </button>
        )}
      </div>

      <div className="mt-8 space-y-2">
        {enabledTasks.map((id, i) => {
          const meta = ALL_TASKS.find((t) => t.id === id);
          const p = Math.min(100, ((elapsedMs / 1000) * 16 + i * 14) % 100);
          const phase =
            p < 25 ? "queue" : p < 70 ? "active" : p < 92 ? "merge" : "ready";
          return (
            <div
              key={id}
              className="border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 animate-fade-up"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-[var(--fg-dim)]">
                  {meta?.label ?? id}
                </span>
                <span
                  className={`font-mono text-[10px] uppercase tracking-wide ${
                    phase === "active"
                      ? "text-[var(--accent)]"
                      : phase === "ready"
                        ? "text-[var(--ok)]"
                        : "text-[var(--muted-2)]"
                  }`}
                >
                  {phase}
                </span>
              </div>
              <div className="h-px overflow-hidden bg-[var(--border)]">
                <div
                  className="progress-fill h-full transition-all duration-700"
                  style={{ width: `${Math.max(10, p)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
