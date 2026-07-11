"use client";

import { ALL_TASKS, type AnalysisDepth, type TaskId } from "@/lib/types";

const PRESETS: { id: string; label: string; tasks: TaskId[] }[] = [
  {
    id: "full",
    label: "full",
    tasks: [
      "explain",
      "fix_bugs",
      "generate_tests",
      "suggest_improvements",
      "security_audit",
      "architecture",
    ],
  },
  {
    id: "core",
    label: "core",
    tasks: ["explain", "fix_bugs", "generate_tests", "suggest_improvements"],
  },
  { id: "bugs", label: "bugs", tasks: ["explain", "fix_bugs"] },
  { id: "tests", label: "tests", tasks: ["generate_tests"] },
  {
    id: "audit",
    label: "audit",
    tasks: ["security_audit", "fix_bugs", "architecture"],
  },
  {
    id: "quality",
    label: "quality",
    tasks: ["explain", "suggest_improvements", "architecture"],
  },
];

interface TaskTogglesProps {
  enabled: Set<TaskId>;
  onChange: (next: Set<TaskId>) => void;
  depth?: AnalysisDepth;
  onDepthChange?: (d: AnalysisDepth) => void;
  disabled?: boolean;
}

export function TaskToggles({
  enabled,
  onChange,
  depth = "standard",
  onDepthChange,
  disabled,
}: TaskTogglesProps) {
  const toggle = (id: TaskId) => {
    const next = new Set(enabled);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  const applyPreset = (tasks: TaskId[]) => {
    onChange(new Set(tasks));
  };

  const isPresetActive = (tasks: TaskId[]) =>
    tasks.length === enabled.size && tasks.every((t) => enabled.has(t));

  const activeCount = enabled.size;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
      <div className="flex flex-wrap items-stretch shadow-[0_0_0_1px_var(--border)]">
        {ALL_TASKS.map((task, idx) => {
          const on = enabled.has(task.id);
          return (
            <button
              key={task.id}
              type="button"
              disabled={disabled}
              title={task.description}
              onClick={() => toggle(task.id)}
              className={`task-chip ${on ? "task-chip-on" : "task-chip-off"} ${
                idx === 0 ? "" : "-ml-px"
              }`}
            >
              <span className={`dot ${on ? "dot-on" : ""}`} />
              <span className="hidden sm:inline">{task.label}</span>
              <span className="sm:hidden">{task.shortLabel}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono text-[10px] text-[var(--muted-2)]">
          <span className="text-[var(--accent)]">{activeCount}</span>/{ALL_TASKS.length}{" "}
          lenses
        </span>
        <span className="hidden h-3 w-px bg-[var(--border)] sm:inline-block" />
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={disabled}
            onClick={() => applyPreset(p.tasks)}
            className={`font-mono text-[10px] uppercase tracking-[0.1em] transition ${
              isPresetActive(p.tasks)
                ? "text-[var(--accent)]"
                : "text-[var(--muted-2)] hover:text-[var(--fg-dim)]"
            }`}
          >
            {isPresetActive(p.tasks) ? `▸ ${p.label}` : p.label}
          </button>
        ))}
        {onDepthChange && (
          <>
            <span className="hidden h-3 w-px bg-[var(--border)] sm:inline-block" />
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                onDepthChange(depth === "deep" ? "standard" : "deep")
              }
              title={
                depth === "deep"
                  ? "Deep mode: exhaustive findings + broader context"
                  : "Switch to deep analysis"
              }
              className={`font-mono text-[10px] uppercase tracking-[0.1em] transition ${
                depth === "deep"
                  ? "text-[var(--warn)]"
                  : "text-[var(--muted-2)] hover:text-[var(--fg-dim)]"
              }`}
            >
              {depth === "deep" ? "▸ deep" : "deep"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
