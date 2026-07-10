"use client";

import type { CodeFile } from "@/lib/types";

interface FileNavProps {
  files: CodeFile[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

export function FileNav({ files, selectedPath, onSelect }: FileNavProps) {
  if (files.length < 2 || !selectedPath) return null;
  const idx = files.findIndex((f) => f.path === selectedPath);
  if (idx < 0) return null;

  const prev = idx > 0 ? files[idx - 1] : null;
  const next = idx < files.length - 1 ? files[idx + 1] : null;

  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        disabled={!prev}
        onClick={() => prev && onSelect(prev.path)}
        className="btn-ghost !px-1.5 !py-0.5 disabled:opacity-30"
        title={prev ? `Prev: ${prev.name}` : "No previous file"}
      >
        ←
      </button>
      <span className="min-w-[3.5rem] text-center font-mono text-[10px] tabular-nums text-[var(--muted-2)]">
        {idx + 1}/{files.length}
      </span>
      <button
        type="button"
        disabled={!next}
        onClick={() => next && onSelect(next.path)}
        className="btn-ghost !px-1.5 !py-0.5 disabled:opacity-30"
        title={next ? `Next: ${next.name}` : "No next file"}
      >
        →
      </button>
    </div>
  );
}
