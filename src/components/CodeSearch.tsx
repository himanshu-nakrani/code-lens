"use client";

import { useEffect, useMemo, useState } from "react";

interface CodeSearchProps {
  code: string;
  open: boolean;
  onClose: () => void;
  onJump?: (line: number) => void;
}

export function CodeSearch({ code, open, onClose, onJump }: CodeSearchProps) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);

  const matches = useMemo(() => {
    if (!q.trim()) return [] as { line: number; text: string }[];
    const needle = q.toLowerCase();
    const out: { line: number; text: string }[] = [];
    code.split("\n").forEach((line, i) => {
      if (line.toLowerCase().includes(needle)) {
        out.push({ line: i + 1, text: line.trim().slice(0, 120) });
      }
    });
    return out.slice(0, 80);
  }, [code, q]);

  useEffect(() => {
    setIdx(0);
  }, [q]);

  useEffect(() => {
    if (!open) {
      setQ("");
      setIdx(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Enter" && matches.length) {
        e.preventDefault();
        if (e.shiftKey) {
          setIdx((i) => {
            const n = (i - 1 + matches.length) % matches.length;
            onJump?.(matches[n].line);
            return n;
          });
        } else if (e.metaKey || e.ctrlKey) {
          onJump?.(matches[idx]?.line);
          onClose();
        } else {
          setIdx((i) => {
            const n = (i + 1) % matches.length;
            onJump?.(matches[n].line);
            return n;
          });
        }
      }
      if (e.key === "ArrowDown" && matches.length) {
        e.preventDefault();
        setIdx((i) => {
          const n = Math.min(matches.length - 1, i + 1);
          onJump?.(matches[n].line);
          return n;
        });
      }
      if (e.key === "ArrowUp" && matches.length) {
        e.preventDefault();
        setIdx((i) => {
          const n = Math.max(0, i - 1);
          onJump?.(matches[n].line);
          return n;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, matches, idx, onClose, onJump]);

  if (!open) return null;

  return (
    <div className="menu-panel absolute right-2 top-9 z-20 w-80 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-2 py-1.5">
        <span className="font-mono text-[10px] text-[var(--accent)]" aria-hidden>
          find
        </span>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search in file…"
          className="flex-1 bg-transparent font-mono text-[11px] text-[var(--fg)] outline-none placeholder:text-[var(--muted-2)]"
          aria-label="Find in file"
        />
        <span className="font-mono text-[10px] tabular-nums text-[var(--muted-2)]">
          {matches.length ? `${idx + 1}/${matches.length}` : "0"}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="icon-btn !min-w-0 !px-1.5"
          aria-label="Close find"
        >
          ×
        </button>
      </div>
      <ul className="max-h-52 overflow-y-auto">
        {matches.map((m, i) => (
          <li key={`${m.line}-${i}`}>
            <button
              type="button"
              onMouseEnter={() => setIdx(i)}
              onClick={() => {
                onJump?.(m.line);
                setIdx(i);
              }}
              className={`flex w-full items-start gap-2 px-2 py-1.5 text-left font-mono text-[10px] transition ${
                i === idx
                  ? "bg-[var(--accent-dim)] text-[var(--fg)]"
                  : "text-[var(--fg-dim)] hover:bg-[var(--surface-2)]"
              }`}
            >
              <span className="shrink-0 text-[var(--accent)]">L{m.line}</span>
              <span className="min-w-0 truncate">{m.text || " "}</span>
            </button>
          </li>
        ))}
        {q && matches.length === 0 && (
          <li className="px-3 py-4 text-center text-[11px] text-[var(--muted)]">
            No matches
          </li>
        )}
        {!q && (
          <li className="px-3 py-3 text-center font-mono text-[10px] text-[var(--muted-2)]">
            Type to search · ↵ next · ⇧↵ prev
          </li>
        )}
      </ul>
    </div>
  );
}
