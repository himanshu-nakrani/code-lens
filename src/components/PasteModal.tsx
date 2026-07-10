"use client";

import { useEffect, useState } from "react";
import { detectLanguage } from "@/lib/languages";

interface PasteModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (opts: { filename: string; content: string; language: string }) => void;
}

export function PasteModal({ open, onClose, onSubmit }: PasteModalProps) {
  const [filename, setFilename] = useState("snippet.js");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && content.trim()) {
        e.preventDefault();
        submit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, content, filename]);

  if (!open) return null;

  const language = detectLanguage(filename);

  function submit() {
    if (!content.trim()) return;
    onSubmit({
      filename: filename.trim() || "snippet.txt",
      content,
      language: detectLanguage(filename.trim() || "snippet.txt"),
    });
    setContent("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/75"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="modal-panel relative z-10 flex w-full max-w-xl flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--fg)]">Paste code</h2>
            <p className="text-[11px] text-[var(--muted)]">
              Drop text without uploading a file · language from extension
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost text-sm">
            ✕
          </button>
        </header>
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            <label className="shrink-0 text-[11px] text-[var(--muted)]">Filename</label>
            <input
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="flex-1 border border-[var(--border)] bg-[var(--bg)] px-2 py-1 font-mono text-xs text-[var(--fg)] outline-none focus:border-[var(--accent-border)]"
              placeholder="snippet.js"
            />
            <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[10px] uppercase text-[var(--muted)]">
              {language}
            </span>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            spellCheck={false}
            placeholder="// paste source here…"
            className="w-full resize-y border border-[var(--border)] bg-[var(--bg)] p-2 font-mono text-xs leading-relaxed text-[var(--fg-dim)] outline-none focus:border-[var(--accent-border)]"
            autoFocus
          />
        </div>
        <footer className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
          <span className="font-mono text-[10px] text-[var(--muted-2)]">
            {content.length} chars · ⌘↵ to add
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary text-xs">
              Cancel
            </button>
            <button
              type="button"
              disabled={!content.trim()}
              onClick={submit}
              className="btn-primary text-xs"
            >
              Add to workspace
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
