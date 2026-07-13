"use client";

const SHORTCUTS = [
  { keys: "⌘K", desc: "Command palette" },
  { keys: "⌘↵", desc: "Run analysis" },
  { keys: "⌘F", desc: "Find in current file" },
  { keys: "⌘⇧P", desc: "Paste code" },
  { keys: "⌘⇧G", desc: "Load GitHub repo" },
  { keys: "⌘⇧?", desc: "This help" },
  { keys: "Esc", desc: "Close modal / palette" },
  { keys: "1–4", desc: "Empty: run samples · Loaded: switch panes" },
  { keys: "[ ]", desc: "Previous / next file" },
  { keys: "n / p", desc: "Next / previous finding" },
  { keys: "⌘Z", desc: "Undo last applied fix" },
];

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

export function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="modal-scrim" aria-label="Close" onClick={onClose} />
      <div
        className="modal-panel relative z-10 w-full max-w-md overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
      >
        <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h2 id="shortcuts-title" className="text-sm font-semibold text-[var(--fg)]">
            Keyboard shortcuts
          </h2>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="Close">
            ✕
          </button>
        </header>
        <ul className="max-h-[min(60vh,24rem)] divide-y divide-[var(--border)] overflow-y-auto">
          {SHORTCUTS.map((s) => (
            <li
              key={s.keys}
              className="flex items-center justify-between gap-4 px-4 py-2.5"
            >
              <span className="text-xs text-[var(--fg-dim)]">{s.desc}</span>
              <kbd className="shrink-0 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--code-bg)] px-2 py-1 font-mono text-[10px] text-[var(--accent)]">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
        <footer className="border-t border-[var(--border)] px-4 py-2 font-mono text-[10px] text-[var(--muted-2)]">
          Theme and more live in the command palette (⌘K)
        </footer>
      </div>
    </div>
  );
}
