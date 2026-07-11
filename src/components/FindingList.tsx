"use client";

import type { Finding, Severity } from "@/lib/types";
import { sortBySeverity } from "@/lib/findings";

interface FindingListProps {
  findings: Finding[];
  onJumpToLine?: (line: number) => void;
  emptyLabel?: string;
}

const SEV_CLASS: Record<Severity, string> = {
  critical: "sev-critical",
  high: "sev-high",
  medium: "sev-medium",
  low: "sev-low",
  info: "sev-info",
};

export function FindingList({
  findings,
  onJumpToLine,
  emptyLabel = "No findings.",
}: FindingListProps) {
  if (!findings.length) {
    return <p className="text-xs text-[var(--muted)]">{emptyLabel}</p>;
  }

  const sorted = sortBySeverity(findings);

  return (
    <ul className="space-y-1.5">
      {sorted.map((f, i) => {
        const clickable = Boolean(onJumpToLine && f.line != null);
        return (
          <li
            key={`${f.title}-${f.line ?? i}-${i}`}
            className={`finding-card animate-fade-up border border-[var(--border)] bg-[var(--code-bg)] ${SEV_CLASS[f.severity]} ${
              clickable ? "finding-card-clickable" : ""
            }`}
            style={{ animationDelay: `${i * 0.04}s` }}
            onClick={
              clickable && f.line != null
                ? () => onJumpToLine?.(f.line!)
                : undefined
            }
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={
              clickable && f.line != null
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onJumpToLine?.(f.line!);
                    }
                  }
                : undefined
            }
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`sev-badge ${SEV_CLASS[f.severity]}`}>
                {f.severity}
              </span>
              {f.line != null && (
                <span className="font-mono text-[10px] text-[var(--accent)]">
                  L{f.line}
                  {f.endLine && f.endLine !== f.line ? `–${f.endLine}` : ""}
                  {clickable ? " ↗" : ""}
                </span>
              )}
              {f.ruleId && (
                <span className="font-mono text-[10px] text-[var(--muted-2)]">
                  {f.ruleId}
                </span>
              )}
              {f.category && (
                <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--muted-2)]">
                  {f.category}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs font-medium text-[var(--fg)]">{f.title}</p>
            {f.detail && f.detail !== f.title && (
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--fg-dim)]">
                {f.detail}
              </p>
            )}
            {f.suggestion && (
              <p className="mt-1.5 border-t border-[var(--border)] pt-1.5 text-[11px] leading-relaxed text-[var(--muted)]">
                <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--accent)]">
                  fix
                </span>{" "}
                {f.suggestion}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function SeverityStrip({
  counts,
}: {
  counts: Record<Severity, number>;
}) {
  const items: Severity[] = ["critical", "high", "medium", "low", "info"];
  const total = items.reduce((s, k) => s + (counts[k] ?? 0), 0);
  if (!total) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
      {items.map((s) =>
        counts[s] ? (
          <span key={s} className={`sev-badge ${SEV_CLASS[s]}`}>
            {counts[s]} {s}
          </span>
        ) : null
      )}
    </div>
  );
}
