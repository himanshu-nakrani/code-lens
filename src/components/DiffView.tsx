"use client";

import { useMemo } from "react";
import { countDiffStats, diffLines } from "@/lib/diff";

interface DiffViewProps {
  before: string;
  after: string;
  maxHeight?: string;
  title?: string;
}

export function DiffView({
  before,
  after,
  maxHeight = "320px",
  title = "diff",
}: DiffViewProps) {
  const lines = useMemo(() => diffLines(before, after), [before, after]);
  const stats = useMemo(() => countDiffStats(lines), [lines]);
  const unchanged = lines.filter((l) => l.type === "same").length;

  return (
    <div className="diff-shell">
      <div className="diff-shell-head">
        <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--muted)]">
          {title}
        </span>
        <span className="flex items-center gap-2 font-mono text-[10px]">
          <span className="text-[var(--ok)]">+{stats.added}</span>
          <span className="text-[var(--danger)]">−{stats.removed}</span>
          {unchanged > 0 && (
            <span className="text-[var(--muted-2)]">{unchanged} same</span>
          )}
        </span>
      </div>
      <div
        className="overflow-auto font-mono text-[11px] leading-[1.55]"
        style={{ maxHeight }}
      >
        {lines.length === 0 ? (
          <p className="px-3 py-4 text-center text-[var(--muted-2)]">No differences</p>
        ) : (
          lines.map((line, idx) => {
            const bg =
              line.type === "add"
                ? "bg-[var(--ok-dim)]"
                : line.type === "del"
                  ? "bg-[var(--danger-dim)]"
                  : "";
            const mark =
              line.type === "add" ? (
                <span className="text-[var(--ok)]">+</span>
              ) : line.type === "del" ? (
                <span className="text-[var(--danger)]">−</span>
              ) : (
                <span className="text-[var(--muted-2)]"> </span>
              );
            const numColor =
              line.type === "add"
                ? "text-[var(--ok)]"
                : line.type === "del"
                  ? "text-[var(--danger)]"
                  : "text-[var(--muted-2)]";
            return (
              <div
                key={idx}
                className={`diff-line-enter flex ${bg}`}
                style={{
                  animationDelay: `${Math.min(idx, 40) * 0.012}s`,
                }}
              >
                <span
                  className={`w-8 shrink-0 select-none pr-1 text-right tabular-nums ${numColor}`}
                >
                  {line.leftNo ?? ""}
                </span>
                <span
                  className={`w-8 shrink-0 select-none pr-1 text-right tabular-nums ${numColor}`}
                >
                  {line.rightNo ?? ""}
                </span>
                <span className="w-3 shrink-0 select-none text-center">{mark}</span>
                <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre pr-2 text-[var(--fg-dim)]">
                  {line.text || " "}
                </pre>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
