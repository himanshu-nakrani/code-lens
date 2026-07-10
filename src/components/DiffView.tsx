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

  return (
    <div className="overflow-hidden border border-[var(--border)] bg-[var(--code-bg)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-2 py-1">
        <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--muted)]">
          {title}
        </span>
        <span className="font-mono text-[10px]">
          <span className="text-[var(--ok)]">+{stats.added}</span>
          <span className="mx-1 text-[var(--muted-2)]">/</span>
          <span className="text-[var(--danger)]">−{stats.removed}</span>
        </span>
      </div>
      <div
        className="overflow-auto font-mono text-[11px] leading-[1.5]"
        style={{ maxHeight }}
      >
        {lines.map((line, idx) => {
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
              <span className={`w-8 shrink-0 select-none pr-1 text-right ${numColor}`}>
                {line.leftNo ?? ""}
              </span>
              <span className={`w-8 shrink-0 select-none pr-1 text-right ${numColor}`}>
                {line.rightNo ?? ""}
              </span>
              <span className="w-3 shrink-0 select-none text-center">{mark}</span>
              <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre pr-2 text-[var(--fg-dim)]">
                {line.text || " "}
              </pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}
