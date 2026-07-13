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
    <div className="seg" role="group" aria-label="File navigation">
      <button
        type="button"
        disabled={!prev}
        onClick={() => prev && onSelect(prev.path)}
        className="seg-btn disabled:opacity-30"
        title={prev ? `Previous: ${prev.name} ([)` : "No previous file"}
        aria-label="Previous file"
      >
        ←
      </button>
      <span className="seg-btn !cursor-default tabular-nums text-[var(--muted-2)]">
        {idx + 1}/{files.length}
      </span>
      <button
        type="button"
        disabled={!next}
        onClick={() => next && onSelect(next.path)}
        className="seg-btn disabled:opacity-30"
        title={next ? `Next: ${next.name} (])` : "No next file"}
        aria-label="Next file"
      >
        →
      </button>
    </div>
  );
}
