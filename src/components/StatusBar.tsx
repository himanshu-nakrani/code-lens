"use client";

import { formatBytes } from "@/lib/files";
import type { CodeStats } from "@/lib/stats";
import { Spectrogram } from "./Spectrogram";

interface StatusBarProps {
  fileCount: number;
  totalBytes: number;
  language: string;
  lineCount: number;
  loading: boolean;
  durationMs: number | null;
  elapsedMs: number;
  lastTarget: string | null;
  hasResult: boolean;
  hasApiKey?: boolean | null;
  sourceStats?: CodeStats | null;
  workspaceSource?: string | null;
  findingCount?: number;
  depth?: string;
  onOpenResults?: () => void;
  onOpenCode?: () => void;
}

export function StatusBar({
  fileCount,
  totalBytes,
  language,
  lineCount,
  loading,
  durationMs,
  elapsedMs,
  lastTarget,
  hasResult,
  hasApiKey,
  findingCount = 0,
  depth,
  onOpenResults,
  onOpenCode,
}: StatusBarProps) {
  return (
    <footer className="status-bar glass-footer relative z-20 shrink-0 border-t border-[var(--border)] px-3 py-1.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] tracking-wide text-[var(--muted)]">
        <span className="inline-flex items-center gap-2">
          {loading ? <Spectrogram active bars={8} /> : null}
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`status-dot ${loading ? "status-dot-pulse" : hasResult ? "status-dot-ok" : ""}`}
            />
            {loading ? "analyzing" : hasResult ? "ready" : "idle"}
          </span>
        </span>
        {hasApiKey === false && (
          <span className="text-[var(--danger)]">key missing</span>
        )}
        <span>
          {fileCount} file{fileCount === 1 ? "" : "s"}
          {totalBytes > 0 && (
            <span className="text-[var(--muted-2)]"> · {formatBytes(totalBytes)}</span>
          )}
        </span>
        {lineCount > 0 && language && language !== "text" && (
          <button
            type="button"
            className="status-click text-[var(--muted-2)]"
            onClick={onOpenCode}
            title="Focus code pane"
          >
            {language} · {lineCount}L
          </button>
        )}
        {findingCount > 0 && !loading && (
          <button
            type="button"
            className="status-click text-[var(--danger)]"
            onClick={onOpenResults}
            title="Open analysis findings"
          >
            {findingCount} finding{findingCount === 1 ? "" : "s"}
          </button>
        )}
        {depth === "deep" && <span className="text-[var(--warn)]">deep</span>}
        {loading && (
          <span className="tabular-nums text-[var(--accent)]">
            t+{(elapsedMs / 1000).toFixed(1)}s
          </span>
        )}
        {!loading && durationMs != null && (
          <span className="tabular-nums text-[var(--muted-2)]">
            last {(durationMs / 1000).toFixed(1)}s
          </span>
        )}
        {lastTarget && (
          <span
            className="ml-auto max-w-[30%] truncate text-[var(--muted-2)]"
            title={lastTarget}
          >
            {lastTarget}
          </span>
        )}
        {!lastTarget && (
          <span className="ml-auto hidden text-[var(--muted-2)] lg:inline">⌘K · ⌘↵</span>
        )}
      </div>
    </footer>
  );
}
