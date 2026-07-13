"use client";

import type { LocalFinding } from "@/lib/local-scan";
import { countBySeverity } from "@/lib/findings";

interface LocalScanStripProps {
  findings: LocalFinding[];
  onJump?: (line: number) => void;
  onOpenPanel?: () => void;
  compact?: boolean;
}

/** Instant local heuristics — complements AI analysis. */
export function LocalScanStrip({
  findings,
  onJump,
  onOpenPanel,
  compact,
}: LocalScanStripProps) {
  if (!findings.length) {
    return compact ? null : (
      <div className="local-scan-strip local-scan-clear shrink-0 border-b border-[var(--border)] px-3 py-1.5">
        <span className="font-mono text-[10px] text-[var(--ok)]">
          local scan · clear
        </span>
      </div>
    );
  }

  const counts = countBySeverity(findings);
  const top = findings[0];
  const hot =
    (counts.critical ?? 0) + (counts.high ?? 0);

  return (
    <div className="local-scan-strip shrink-0 border-b border-[var(--border)] px-2.5 py-1.5">
      <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
        <span className="uppercase tracking-wide text-[var(--muted-2)]">
          local
        </span>
        <span className={hot > 0 ? "text-[var(--danger)]" : "text-[var(--warn)]"}>
          {findings.length} issue{findings.length === 1 ? "" : "s"}
        </span>
        {counts.critical > 0 && (
          <span className="sev-badge sev-critical">{counts.critical} crit</span>
        )}
        {counts.high > 0 && (
          <span className="sev-badge sev-high">{counts.high} high</span>
        )}
        {top?.line != null && onJump && (
          <button
            type="button"
            className="min-w-0 flex-1 truncate text-left text-[var(--fg-dim)] hover:text-[var(--accent)]"
            onClick={() => onJump(top.line!)}
            title={top.title}
          >
            L{top.line} · {top.title}
          </button>
        )}
        {onOpenPanel && (
          <button type="button" className="linkish !text-[10px]" onClick={onOpenPanel}>
            details
          </button>
        )}
      </div>
    </div>
  );
}
