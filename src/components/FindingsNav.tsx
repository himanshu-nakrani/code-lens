"use client";

import type { Finding } from "@/lib/types";
import { sortBySeverity } from "@/lib/findings";

interface FindingsNavProps {
  findings: Finding[];
  activeIndex: number;
  onJump: (index: number, line: number) => void;
}

export function FindingsNav({ findings, activeIndex, onJump }: FindingsNavProps) {
  const lined = sortBySeverity(findings).filter(
    (f) => typeof f.line === "number" && f.line > 0
  );
  if (lined.length === 0) return null;

  const idx = Math.max(0, Math.min(activeIndex, lined.length - 1));
  const current = lined[idx];

  const go = (i: number) => {
    const clamped = (i + lined.length) % lined.length;
    const f = lined[clamped];
    if (f.line != null) onJump(clamped, f.line);
  };

  return (
    <div className="findings-nav flex shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-2)] px-2 py-1">
      <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--muted-2)]">
        findings
      </span>
      <button
        type="button"
        className="btn-ghost !px-1.5 !py-0.5 font-mono text-[10px]"
        onClick={() => go(idx - 1)}
        title="Previous finding"
      >
        ↑
      </button>
      <button
        type="button"
        className="btn-ghost !px-1.5 !py-0.5 font-mono text-[10px]"
        onClick={() => go(idx + 1)}
        title="Next finding"
      >
        ↓
      </button>
      <span className="font-mono text-[10px] tabular-nums text-[var(--fg-dim)]">
        {idx + 1}/{lined.length}
      </span>
      {current && (
        <button
          type="button"
          onClick={() => current.line != null && onJump(idx, current.line)}
          className="min-w-0 flex-1 truncate text-left font-mono text-[10px] text-[var(--accent)] hover:underline"
          title={current.title}
        >
          L{current.line} · [{current.severity}] {current.title}
        </button>
      )}
    </div>
  );
}
