"use client";

import { useCallback } from "react";
import { SAMPLE_META, SAMPLE_SNIPPETS } from "@/lib/samples";
import type { CodeFile } from "@/lib/types";

interface SampleCardsProps {
  onLoad: (sample: CodeFile, autoAnalyze?: boolean) => void;
  disabled?: boolean;
}

function langShort(lang: string): string {
  if (lang === "javascript") return "js";
  if (lang === "typescript") return "ts";
  if (lang === "python") return "py";
  return lang.slice(0, 3);
}

/** Tiny syntax tint for previews — illustrative, not a full parser */
function tintPreview(src: string, language: string): string {
  const lines = src.split("\n").filter((l) => l.trim().length > 0).slice(0, 5);
  return lines
    .map((line) => {
      let e = line
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      e = e.replace(/(\/\/.*$|#.*$|""".*?"""|'''.*?''')/g, '<span class="tok-cm">$1</span>');
      if (language === "python") {
        e = e.replace(
          /\b(def|return|for|in|if|else|import|from|print|True|False|None)\b/g,
          '<span class="tok-kw">$1</span>'
        );
      } else {
        e = e.replace(
          /\b(function|const|let|var|return|for|if|else|export|type|import|from|module|exports)\b/g,
          '<span class="tok-kw">$1</span>'
        );
      }
      e = e.replace(
        /\b([A-Za-z_][A-Za-z0-9_]*)\s*(?=\()/g,
        '<span class="tok-fn">$1</span>'
      );
      e = e.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '<span class="tok-str">$&</span>');
      return e;
    })
    .join("\n");
}

export function SampleCards({ onLoad, disabled }: SampleCardsProps) {
  const onMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 6;
    const y = ((e.clientY - r.top) / r.height - 0.5) * -6;
    el.style.transform = `translateY(-3px) rotateX(${y}deg) rotateY(${x}deg) scale(1.015)`;
  }, []);

  const onLeave = useCallback((e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.transform = "";
  }, []);

  return (
    <div className="sample-stage">
      {SAMPLE_SNIPPETS.map((s, i) => {
        const meta = SAMPLE_META[s.id];
        return (
          <article
            key={s.id}
            className={`sample-focus-card animate-fade-up stagger-${Math.min(i + 1, 4)}`}
            onMouseMove={onMove}
            onMouseLeave={onLeave}
          >
            <span className="sample-hotkey" title={`Press ${i + 1}`}>
              {i + 1}
            </span>
            <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate font-mono text-[12px] font-medium text-[var(--fg)]">
                  {s.name}
                </span>
              </div>
              <span className="shrink-0 rounded-[var(--radius)] border border-[var(--border)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-[var(--muted)]">
                {langShort(s.language)}
              </span>
            </div>

            <pre
              className="sample-preview"
              dangerouslySetInnerHTML={{
                __html: tintPreview(s.content, s.language),
              }}
            />

            <div className="mt-auto border-t border-[var(--border)] px-3 py-2.5">
              <p className="font-mono text-[10px] uppercase tracking-wide text-[var(--muted-2)]">
                {meta?.tag}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[var(--muted)]">
                {meta?.blurb}
              </p>
              <div className="mt-2.5 flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onLoad(s, true)}
                  className="btn-primary flex-1 justify-center !py-1.5"
                  title="Load and analyze"
                >
                  run
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onLoad(s, false)}
                  className="btn-ghost !px-2.5 text-[11px]"
                  title="Load without analyzing"
                >
                  open
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
