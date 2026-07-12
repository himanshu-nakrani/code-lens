"use client";

import { useEffect, useState } from "react";
import { parseGitHubInput } from "@/lib/github-url";
import {
  loadGitHubRecents,
  pushGitHubRecent,
  type GitHubRecent,
} from "@/lib/github-recents";
import type { CodeFile } from "@/lib/types";

export type GitHubLoadResult = {
  files: CodeFile[];
  repo: {
    owner: string;
    name: string;
    ref: string;
    htmlUrl: string;
    private: boolean;
  };
  skipped: string[];
  truncated: string[];
  warnings: string[];
};

interface GitHubModalProps {
  open: boolean;
  onClose: () => void;
  onLoaded: (result: GitHubLoadResult) => void;
  disabled?: boolean;
}

export function GitHubModal({ open, onClose, onLoaded, disabled }: GitHubModalProps) {
  const [input, setInput] = useState("");
  const [ref, setRef] = useState("");
  const [subdir, setSubdir] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recents, setRecents] = useState<GitHubRecent[]>([]);

  const preview = input.trim() ? parseGitHubInput(input) : null;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setRecents(loadGitHubRecents());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !loading) {
        e.preventDefault();
        void submit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loading, input, ref, subdir]);

  if (!open) return null;

  function applyRecent(r: GitHubRecent) {
    setInput(r.input);
    setRef(r.ref || "");
    setSubdir(r.subdir || "");
    setError(null);
  }

  async function submit() {
    if (disabled || loading) return;
    const parsed = parseGitHubInput(input);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: input.trim(),
          ref: ref.trim() || undefined,
          subdir: subdir.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        files?: CodeFile[];
        repo?: GitHubLoadResult["repo"];
        skipped?: string[];
        truncated?: string[];
        warnings?: string[];
      };
      if (!data.ok || !data.files || !data.repo) {
        setError(data.error || `Request failed (HTTP ${res.status}).`);
        setLoading(false);
        return;
      }
      const list = pushGitHubRecent({
        input:
          subdir.trim() || ref.trim()
            ? `${data.repo.owner}/${data.repo.name}`
            : input.trim(),
        owner: data.repo.owner,
        name: data.repo.name,
        ref: ref.trim() || data.repo.ref,
        subdir: subdir.trim() || undefined,
        htmlUrl: data.repo.htmlUrl,
      });
      setRecents(list);
      onLoaded({
        files: data.files,
        repo: data.repo,
        skipped: data.skipped ?? [],
        truncated: data.truncated ?? [],
        warnings: data.warnings ?? [],
      });
      setLoading(false);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/75"
        aria-label="Close"
        onClick={() => !loading && onClose()}
      />
      <div className="modal-panel relative z-10 flex w-full max-w-lg flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--fg)]">Load GitHub repo</h2>
            <p className="text-[11px] text-[var(--muted)]">
              Public repos work as-is · private needs{" "}
              <span className="font-mono text-[var(--accent)]">GITHUB_TOKEN</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => !loading && onClose()}
            className="btn-ghost text-sm"
            disabled={loading}
          >
            ✕
          </button>
        </header>

        <div className="flex flex-col gap-3 p-4">
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-[var(--muted-2)]">
              repository
            </label>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              autoFocus
              spellCheck={false}
              placeholder="owner/repo or https://github.com/owner/repo"
              className="w-full border border-[var(--border)] bg-[var(--bg)] px-2.5 py-2 font-mono text-xs text-[var(--fg)] outline-none focus:border-[var(--accent-border)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-[var(--muted-2)]">
                branch / ref
              </label>
              <input
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                disabled={loading}
                spellCheck={false}
                placeholder="default branch"
                className="w-full border border-[var(--border)] bg-[var(--bg)] px-2.5 py-2 font-mono text-xs text-[var(--fg)] outline-none focus:border-[var(--accent-border)]"
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-[var(--muted-2)]">
                subfolder
              </label>
              <input
                value={subdir}
                onChange={(e) => setSubdir(e.target.value)}
                disabled={loading}
                spellCheck={false}
                placeholder="e.g. src"
                className="w-full border border-[var(--border)] bg-[var(--bg)] px-2.5 py-2 font-mono text-xs text-[var(--fg)] outline-none focus:border-[var(--accent-border)]"
              />
            </div>
          </div>

          {preview?.ok && (
            <div className="border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-2 font-mono text-[10px] text-[var(--muted)]">
              <span className="text-[var(--accent)]">
                {preview.value.owner}/{preview.value.repo}
              </span>
              {(ref.trim() || preview.value.ref) && (
                <span>
                  {" "}
                  @ {ref.trim() || preview.value.ref}
                </span>
              )}
              {(subdir.trim() || preview.value.subdir) && (
                <span>
                  {" "}
                  · /{subdir.trim() || preview.value.subdir}
                </span>
              )}
            </div>
          )}

          {preview && !preview.ok && input.trim() && (
            <p className="text-[11px] text-[var(--danger)]">{preview.error}</p>
          )}

          {error && (
            <div className="border border-[var(--danger)]/40 bg-[var(--danger-dim)] px-2.5 py-2 text-[11px] text-[var(--danger)]">
              {error}
            </div>
          )}

          {recents.length > 0 && (
            <div>
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wide text-[var(--muted-2)]">
                recent
              </p>
              <ul className="max-h-28 space-y-1 overflow-y-auto">
                {recents.map((r) => (
                  <li key={`${r.owner}/${r.name}/${r.ref}/${r.subdir}/${r.at}`}>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => applyRecent(r)}
                      className="flex w-full items-center gap-2 border border-[var(--border)] bg-[var(--code-bg)] px-2 py-1.5 text-left font-mono text-[10px] text-[var(--fg-dim)] transition hover:border-[var(--accent-border)] hover:text-[var(--accent)]"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {r.owner}/{r.name}
                        {r.ref ? `@${r.ref}` : ""}
                        {r.subdir ? ` · ${r.subdir}` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[10px] leading-relaxed text-[var(--muted-2)]">
            Loads text/source files only (skips node_modules, locks, binaries). Prefers app
            source over tests/docs under size caps · 80 files · 200 KB · 2 MB.
          </p>
        </div>

        <footer className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
          <span className="font-mono text-[10px] text-[var(--muted-2)]">
            ⌘↵ to load
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => !loading && onClose()}
              disabled={loading}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading || !input.trim() || disabled}
              onClick={() => void submit()}
              className="btn-primary text-xs"
            >
              {loading ? (
                <>
                  <span className="spinner spinner-sm" />
                  fetching…
                </>
              ) : (
                "Load into workspace"
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
