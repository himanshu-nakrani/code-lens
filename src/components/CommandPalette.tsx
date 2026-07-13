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
        setActive((i) => Math.min(Math.max(filtered.length - 1, 0), i + 1));
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
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        aria-label="Close command palette"
        onClick={onClose}
      />
      <div
        className="modal-panel relative z-10 w-full max-w-lg overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2.5">
          <span className="font-mono text-[11px] text-[var(--accent)]" aria-hidden>
            ⌘
          </span>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search commands…"
            className="flex-1 bg-transparent font-mono text-[13px] text-[var(--fg)] outline-none placeholder:text-[var(--muted-2)]"
            aria-label="Search commands"
          />
          <kbd className="hidden sm:inline">esc</kbd>
        </div>
        <ul className="max-h-[min(50vh,22rem)] overflow-y-auto py-1">
          {filtered.length === 0 && (
            <li className="px-3 py-6 text-center font-mono text-[11px] text-[var(--muted)]">
              No matches for “{q.trim()}”
            </li>
          )}
          {groups.map((g) => {
            const items = filtered.filter((c) => (c.group || "Actions") === g);
            if (!items.length) return null;
            return (
              <li key={g}>
                <p className="menu-label px-3 pt-2">{g}</p>
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
                      className={`menu-item ${
                        idx === active ? "menu-item-active" : ""
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate">{c.label}</span>
                      {c.hint && (
                        <span className="shrink-0 font-mono text-[10px] text-[var(--muted-2)]">
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
        <div className="flex items-center justify-between border-t border-[var(--border)] px-3 py-1.5 font-mono text-[9px] text-[var(--muted-2)]">
          <span>↑↓ navigate · ↵ run</span>
          <span>{filtered.length} cmds</span>
        </div>
      </div>
    </div>
  );
}
