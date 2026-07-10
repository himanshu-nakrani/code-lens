"use client";

import { useMemo, useState } from "react";
import type { CodeFile } from "@/lib/types";
import { formatBytes } from "@/lib/files";

interface FileTreeProps {
  files: CodeFile[];
  selectedPath: string | null;
  onSelect: (path: string | null) => void;
}

export function FileTree({ files, selectedPath, onSelect }: FileTreeProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return files;
    return files.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.path.toLowerCase().includes(q) ||
        f.language.toLowerCase().includes(q)
    );
  }, [files, query]);

  if (files.length === 0) {
    return (
      <div className="flex h-full flex-col justify-center px-3 py-8">
        <p className="pane-title">files</p>
        <p className="mt-2 font-mono text-[11px] text-[var(--muted)]">none loaded</p>
        <p className="mt-1 text-[11px] text-[var(--muted-2)]">
          drop · paste · sample
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col pane-glow">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-3 py-2">
        <span className="pane-title">files</span>
        <span className="border border-[var(--border)] bg-[var(--bg)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted-2)]">
          {filtered.length}
          {filtered.length !== files.length ? `/${files.length}` : ""}
        </span>
      </div>

      {files.length > 3 && (
        <div className="shrink-0 border-b border-[var(--border)] px-2 py-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="filter…"
            className="w-full border border-[var(--border)] bg-[var(--bg)] px-2 py-1 font-mono text-[11px] text-[var(--fg)] outline-none placeholder:text-[var(--muted-2)] focus:border-[var(--accent-border)]"
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`mx-2 mt-2 flex items-center gap-2 px-2 py-1.5 text-left font-mono text-[11px] transition ${
          selectedPath === null
            ? "border border-[var(--accent-border)] bg-[var(--accent-dim)] text-[var(--accent)]"
            : "border border-transparent text-[var(--fg-dim)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
        }`}
      >
        <span className="text-[var(--muted-2)]">∗</span>
        entire workspace
      </button>

      <ul className="min-h-0 flex-1 overflow-y-auto px-1 py-2">
        {filtered.length === 0 && (
          <li className="px-2 py-4 text-center font-mono text-[11px] text-[var(--muted-2)]">
            no match “{query}”
          </li>
        )}
        {filtered.map((f) => {
          const active = selectedPath === f.path;
          const lines = f.content.split("\n").length;
          return (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => onSelect(f.path)}
                className={`relative flex w-full items-start gap-2 px-2 py-1.5 text-left transition ${
                  active
                    ? "file-active-rail bg-[var(--surface-2)] text-[var(--fg)]"
                    : "text-[var(--fg-dim)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
                }`}
              >
                <span
                  className={`mt-0.5 shrink-0 px-1 py-0.5 font-mono text-[9px] uppercase ${langChip(f.language)}`}
                >
                  {langBadge(f.language)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-[11px]">{f.name}</span>
                  {f.path !== f.name && (
                    <span className="block truncate text-[10px] text-[var(--muted-2)]">
                      {f.path}
                    </span>
                  )}
                  <span className="mt-0.5 block font-mono text-[9px] text-[var(--muted-2)]">
                    {lines}L · {formatBytes(f.size)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function langBadge(lang: string): string {
  const map: Record<string, string> = {
    javascript: "js",
    typescript: "ts",
    python: "py",
    tsx: "tsx",
    jsx: "jsx",
  };
  return map[lang] ?? lang.slice(0, 3);
}

function langChip(lang: string): string {
  if (lang === "javascript" || lang === "jsx")
    return "bg-[var(--accent-dim)] text-[var(--accent)]";
  if (lang === "typescript" || lang === "tsx")
    return "bg-[var(--surface-3)] text-[var(--fg-dim)]";
  if (lang === "python") return "bg-[var(--ok-dim)] text-[var(--ok)]";
  return "bg-[var(--surface-2)] text-[var(--muted-2)]";
}
