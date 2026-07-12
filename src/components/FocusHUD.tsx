"use client";

interface FocusHUDProps {
  target: string;
  language: string;
  loading: boolean;
  hasResult: boolean;
  lineCount: number;
}

/** Compact focus readout — path + language only (status lives in the footer). */
export function FocusHUD({
  target,
  language,
  loading,
  hasResult,
  lineCount,
}: FocusHUDProps) {
  if (!target) return null;

  return (
    <div className="focus-hud shrink-0 border-b border-[var(--border)] px-3 py-1">
      <div className="flex min-w-0 items-center gap-x-3 font-mono text-[10px]">
        <span className="shrink-0 tracking-[0.12em] text-[var(--muted-2)]">
          FOCUS
        </span>
        <span className="min-w-0 truncate text-[var(--fg-dim)]" title={target}>
          {target}
        </span>
        {language && language !== "text" && (
          <span className="shrink-0 text-[var(--muted)]">{language}</span>
        )}
        {lineCount > 0 && (
          <span className="shrink-0 text-[var(--muted-2)]">{lineCount}L</span>
        )}
        {loading && (
          <span className="ml-auto shrink-0 text-[var(--accent)]">focusing…</span>
        )}
        {!loading && hasResult && (
          <span className="ml-auto shrink-0 text-[var(--muted-2)]">ready</span>
        )}
      </div>
    </div>
  );
}
