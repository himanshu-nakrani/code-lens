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
  sourceStats,
  workspaceSource,
  findingCount = 0,
  depth,
}: StatusBarProps) {
  return (
    <footer className="status-bar relative z-20 shrink-0 border-t border-[var(--border)] bg-[var(--surface)] px-3 py-1.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] tracking-wide text-[var(--muted)]">
        <span className="inline-flex items-center gap-2">
          <Spectrogram active={loading} bars={10} />
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`status-dot ${loading ? "status-dot-pulse" : hasResult ? "status-dot-ok" : ""}`}
            />
            {loading ? "focusing" : hasResult ? "locked" : "idle"}
          </span>
        </span>
        {hasApiKey != null && (
          <span className={hasApiKey ? "text-[var(--ok)]" : "text-[var(--danger)]"}>
            {hasApiKey ? "key·ok" : "key·missing"}
          </span>
        )}
        {workspaceSource && (
          <span className="max-w-[10rem] truncate text-[var(--accent)]" title={workspaceSource}>
            {workspaceSource}
          </span>
        )}
        {depth === "deep" && <span className="text-[var(--warn)]">deep</span>}
        {findingCount > 0 && (
          <span className="text-[var(--danger)]">{findingCount} findings</span>
        )}
        <span>
          <span className="text-[var(--muted-2)]">n</span>={fileCount}
        </span>
        <span>
          <span className="text-[var(--muted-2)]">sz</span> {formatBytes(totalBytes)}
        </span>
        {lineCount > 0 && (
          <span>
            <span className="text-[var(--muted-2)]">ln</span> {lineCount}
          </span>
        )}
        {sourceStats && (
          <span className="hidden sm:inline">
            <span className="text-[var(--muted-2)]">fn</span> {sourceStats.functions}
          </span>
        )}
        {sourceStats && (
          <span className="hidden md:inline">
            <span className="text-[var(--muted-2)]">cx</span> {sourceStats.complexityHint}
          </span>
        )}
        {language && language !== "text" && (
          <span className="text-[var(--fg-dim)]">{language}</span>
        )}
        <span className="hidden sm:inline text-[var(--accent)]">grok-4.5</span>
        {loading && (
          <span className="tabular-nums text-[var(--accent)]">
            t+{(elapsedMs / 1000).toFixed(1)}s
          </span>
        )}
        {!loading && durationMs != null && (
          <span className="tabular-nums">
            last {(durationMs / 1000).toFixed(1)}s
          </span>
        )}
        {lastTarget && (
          <span className="max-w-[24%] truncate text-[var(--muted-2)]" title={lastTarget}>
            → {lastTarget}
          </span>
        )}
        <span className="ml-auto hidden text-[var(--muted-2)] lg:inline">
          ⌘K · ⌘↵ · ⌘F
        </span>
      </div>
    </footer>
  );
}
