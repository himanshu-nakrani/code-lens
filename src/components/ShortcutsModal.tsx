"use client";

const SHORTCUTS = [
  { keys: "⌘ / Ctrl + K", desc: "Command palette" },
  { keys: "⌘ / Ctrl + Enter", desc: "Run analysis" },
  { keys: "⌘ / Ctrl + F", desc: "Find in current file" },
  { keys: "⌘ / Ctrl + Shift + P", desc: "Paste code dialog" },
  { keys: "⌘ / Ctrl + Shift + ?", desc: "Toggle this help" },
  { keys: "Esc", desc: "Close modal / palette" },
  { keys: "1 / 2 / 3", desc: "Empty: run samples · Loaded: switch panes" },
  { keys: "[ / ]", desc: "Previous / next file in workspace" },
];

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

export function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/75"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="modal-panel relative z-10 w-full max-w-md overflow-hidden">
        <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--fg)]">Keyboard shortcuts</h2>
          <button type="button" onClick={onClose} className="btn-ghost text-sm">
            ✕
          </button>
        </header>
        <ul className="divide-y divide-[var(--border)]">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex items-center justify-between gap-4 px-4 py-2.5">
              <span className="text-xs text-[var(--fg-dim)]">{s.desc}</span>
              <kbd className="shrink-0 rounded border border-[var(--border)] bg-[var(--code-bg)] px-2 py-1 font-mono text-[10px] text-[var(--accent)]">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
