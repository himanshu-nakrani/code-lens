"use client";

import { useEffect, useMemo, useState } from "react";

export type CommandItem = {
  id: string;
  label: string;
  hint?: string;
  group?: string;
  run: () => void;
};

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: CommandItem[];
}

export function CommandPalette({ open, onClose, commands }: CommandPaletteProps) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(needle) ||
        c.hint?.toLowerCase().includes(needle) ||
        c.group?.toLowerCase().includes(needle)
    );
  }, [commands, q]);

  useEffect(() => {
    setActive(0);
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(filtered.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filtered[active];
        if (cmd) {
          onClose();
          cmd.run();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, active, onClose]);

  if (!open) return null;

  const groups = Array.from(new Set(filtered.map((c) => c.group || "Actions")));

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[10vh]">
      <button
        type="button"
        className="absolute inset-0 bg-black/75"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="modal-panel relative z-10 w-full max-w-lg overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
          <span className="font-mono text-[10px] text-[var(--accent)]">&gt;</span>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="command…"
            className="flex-1 bg-transparent font-mono text-[12px] text-[var(--fg)] outline-none placeholder:text-[var(--muted-2)]"
          />
          <kbd>esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto py-0">
          {filtered.length === 0 && (
            <li className="px-3 py-4 text-center font-mono text-[11px] text-[var(--muted)]">
              no matches
            </li>
          )}
          {groups.map((g) => {
            const items = filtered.filter((c) => (c.group || "Actions") === g);
            if (!items.length) return null;
            return (
              <li key={g}>
                <p className="border-b border-[var(--border)] bg-[var(--bg)] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted-2)]">
                  {g}
                </p>
                {items.map((c) => {
                  const idx = filtered.indexOf(c);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => {
                        onClose();
                        c.run();
                      }}
                      className={`flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left font-mono text-[12px] transition ${
                        idx === active
                          ? "bg-[var(--accent-dim)] text-[var(--accent)]"
                          : "text-[var(--fg-dim)] hover:bg-[var(--surface-2)]"
                      }`}
                    >
                      <span>{c.label}</span>
                      {c.hint && (
                        <span className="shrink-0 text-[10px] text-[var(--muted-2)]">
                          {c.hint}
                        </span>
                      )}
                    </button>
                  );
                })}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
