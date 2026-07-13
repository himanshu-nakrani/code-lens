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
  const lines = content ? content.split("\n").length : 0;
  const canSubmit = Boolean(content.trim());

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
        className="modal-scrim"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="modal-panel relative z-10 flex w-full max-w-xl flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="paste-modal-title"
      >
        <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <div>
            <h2 id="paste-modal-title" className="text-sm font-semibold text-[var(--fg)]">
              Paste code
            </h2>
            <p className="text-[11px] text-[var(--muted)]">
              No file upload needed · language from extension
            </p>
          </div>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="Close">
            ✕
          </button>
        </header>
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <label className="field-label" htmlFor="paste-filename">
                Filename
              </label>
              <input
                id="paste-filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="field"
                placeholder="snippet.js"
              />
            </div>
            <span className="mb-0.5 shrink-0 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-2 py-2 font-mono text-[10px] uppercase text-[var(--muted)]">
              {language}
            </span>
          </div>
          <div>
            <label className="field-label" htmlFor="paste-body">
              Source
            </label>
            <textarea
              id="paste-body"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              spellCheck={false}
              placeholder="// paste source here…"
              className="field min-h-[12rem]"
              autoFocus
            />
          </div>
        </div>
        <footer className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
          <span className="font-mono text-[10px] text-[var(--muted-2)]">
            {content.length} chars
            {lines > 0 ? ` · ${lines}L` : ""}
            <span className="ml-2 hidden sm:inline">· ⌘↵ to add</span>
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary text-xs">
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSubmit}
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
