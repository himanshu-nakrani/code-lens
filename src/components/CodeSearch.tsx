"use client";

import { useEffect, useMemo, useState } from "react";

interface CodeSearchProps {
  code: string;
  open: boolean;
  onClose: () => void;
  onJump?: (lineIndex: number) => void;
}

export function CodeSearch({ code, open, onClose }: CodeSearchProps) {
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
    return out.slice(0, 50);
  }, [code, q]);

  useEffect(() => {
    setIdx(0);
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && matches.length) {
        e.preventDefault();
        setIdx((i) => (e.shiftKey ? (i - 1 + matches.length) % matches.length : (i + 1) % matches.length));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, matches, onClose]);

  if (!open) return null;

  return (
    <div className="absolute right-2 top-9 z-20 w-72 overflow-hidden border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-2)] px-2 py-1">
        <span className="font-mono text-[10px] text-[var(--accent)]">/</span>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="find…"
          className="flex-1 bg-transparent font-mono text-[11px] text-[var(--fg)] outline-none placeholder:text-[var(--muted-2)]"
        />
        <span className="font-mono text-[10px] text-[var(--muted-2)]">
          {matches.length ? `${idx + 1}/${matches.length}` : "0"}
        </span>
        <button type="button" onClick={onClose} className="font-mono text-[var(--muted)] hover:text-[var(--fg)]">
          ×
        </button>
      </div>
      <ul className="max-h-48 overflow-y-auto">
        {matches.map((m, i) => (
          <li
            key={`${m.line}-${i}`}
            className={`cursor-default border-b border-[var(--border)]/50 px-2 py-1.5 font-mono text-[10px] ${
              i === idx ? "bg-[var(--accent-dim)] text-[var(--fg)]" : "text-[var(--fg-dim)]"
            }`}
          >
            <span className="mr-2 text-[var(--accent)]">L{m.line}</span>
            {m.text}
          </li>
        ))}
        {q && matches.length === 0 && (
          <li className="px-3 py-3 text-center text-[11px] text-[var(--muted)]">No matches</li>
        )}
      </ul>
    </div>
  );
}
