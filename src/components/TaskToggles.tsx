"use client";

import { useEffect, useRef, useState } from "react";
import { ALL_TASKS, type AnalysisDepth, type TaskId } from "@/lib/types";

const PRESETS: { id: string; label: string; tasks: TaskId[] }[] = [
  {
    id: "core",
    label: "Core",
    tasks: ["explain", "fix_bugs", "generate_tests", "suggest_improvements"],
  },
  {
    id: "full",
    label: "Full",
    tasks: [
      "explain",
      "fix_bugs",
      "generate_tests",
      "suggest_improvements",
      "security_audit",
      "architecture",
    ],
  },
  { id: "bugs", label: "Bugs", tasks: ["explain", "fix_bugs"] },
  { id: "tests", label: "Tests", tasks: ["generate_tests"] },
  {
    id: "audit",
    label: "Audit",
    tasks: ["security_audit", "fix_bugs", "architecture"],
  },
  {
    id: "quality",
    label: "Quality",
    tasks: ["explain", "suggest_improvements", "architecture"],
  },
];

const PRIMARY_TASKS: TaskId[] = [
  "explain",
  "fix_bugs",
  "generate_tests",
  "suggest_improvements",
];
const ADVANCED_TASKS: TaskId[] = ["security_audit", "architecture"];

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
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const presetsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (presetsRef.current && !presetsRef.current.contains(e.target as Node)) {
        setPresetsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Keep advanced chips visible if any advanced lens is armed
  const advancedArmed = ADVANCED_TASKS.some((id) => enabled.has(id));
  const advancedVisible = showAdvanced || advancedArmed;

  const toggle = (id: TaskId) => {
    const next = new Set(enabled);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  const applyPreset = (tasks: TaskId[]) => {
    onChange(new Set(tasks));
    setPresetsOpen(false);
    if (tasks.some((t) => ADVANCED_TASKS.includes(t))) {
      setShowAdvanced(true);
    }
  };

  const isPresetActive = (tasks: TaskId[]) =>
    tasks.length === enabled.size && tasks.every((t) => enabled.has(t));

  const activePreset =
    PRESETS.find((p) => isPresetActive(p.tasks))?.label ?? "Custom";

  const visibleIds = advancedVisible
    ? [...PRIMARY_TASKS, ...ADVANCED_TASKS]
    : PRIMARY_TASKS;

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <div className="flex flex-wrap items-stretch overflow-hidden rounded-[var(--radius)] shadow-[0_0_0_1px_var(--border)]">
        {visibleIds.map((id, idx) => {
          const task = ALL_TASKS.find((t) => t.id === id);
          if (!task) return null;
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
              {task.shortLabel}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => setShowAdvanced((v) => !v)}
        className={`btn-ghost !px-2 !py-1 font-mono text-[10px] uppercase tracking-wide ${
          advancedArmed ? "text-[var(--accent)]" : ""
        }`}
        title="Security & architecture"
      >
        {advancedVisible ? "less" : "more"}
      </button>

      <div className="relative" ref={presetsRef}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setPresetsOpen((v) => !v)}
          className="btn-secondary !px-2 !py-1 font-mono text-[10px] uppercase tracking-wide"
        >
          {activePreset} ▾
        </button>
        {presetsOpen && (
          <div className="absolute left-0 top-full z-40 mt-1 min-w-[9rem] border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() => applyPreset(p.tasks)}
                className={`flex w-full px-3 py-1.5 text-left font-mono text-[11px] hover:bg-[var(--surface-2)] ${
                  isPresetActive(p.tasks)
                    ? "text-[var(--accent)]"
                    : "text-[var(--fg-dim)]"
                }`}
              >
                {isPresetActive(p.tasks) ? "▸ " : ""}
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {onDepthChange && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onDepthChange(depth === "deep" ? "standard" : "deep")}
          title="Deep analysis mode"
          className={`btn-ghost !px-2 !py-1 font-mono text-[10px] uppercase tracking-wide ${
            depth === "deep" ? "text-[var(--warn)]" : ""
          }`}
        >
          {depth === "deep" ? "deep ·" : "deep"}
        </button>
      )}
    </div>
  );
}
