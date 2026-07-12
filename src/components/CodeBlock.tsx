"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { toPrismLanguage } from "@/lib/languages";
import { downloadText } from "@/lib/export";
import type { Finding, Severity } from "@/lib/types";
import { findingsWithLines, sortBySeverity } from "@/lib/findings";
import { lineNumberColor, prismThemeFor } from "@/lib/syntax-theme";
import type { ThemeId } from "@/lib/theme";

export type LineAnnotation = {
  line: number;
  severity: Severity;
  title: string;
};

interface CodeBlockProps {
  code: string;
  language?: string;
  maxHeight?: string;
  showLineNumbers?: boolean;
  filename?: string;
  downloadName?: string;
  fontSize?: number;
  onFontSizeChange?: (n: number) => void;
  showFind?: boolean;
  onToggleFind?: () => void;
  annotations?: Finding[];
  highlightLine?: number | null;
  onAnnotationClick?: (line: number) => void;
  /** Hide dense toolbar chrome (calm code view). */
  compactToolbar?: boolean;
  uiTheme?: ThemeId;
}

const toolBtn =
  "rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)]/80 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[var(--muted)] transition hover:border-[var(--accent-border)] hover:text-[var(--accent)] hover:bg-[var(--accent-dim)]";
const toolBtnOn =
  "rounded-[var(--radius)] border border-[var(--accent-border)] bg-[var(--accent-dim)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[var(--accent)]";

const SEV_GUTTER: Record<Severity, string> = {
  critical: "gutter-critical",
  high: "gutter-high",
  medium: "gutter-medium",
  low: "gutter-low",
  info: "gutter-info",
};

export function CodeBlock({
  code,
  language = "text",
  maxHeight = "100%",
  showLineNumbers = true,
  filename,
  downloadName,
  fontSize = 12,
  onFontSizeChange,
  showFind,
  onToggleFind,
  annotations = [],
  highlightLine = null,
  onAnnotationClick,
  compactToolbar = true,
  uiTheme = "dark",
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [wrap, setWrap] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const byLine = useMemo(() => {
    const map = new Map<number, Finding[]>();
    for (const f of findingsWithLines(annotations)) {
      const list = map.get(f.line!) ?? [];
      list.push(f);
      map.set(f.line!, list);
    }
    return map;
  }, [annotations]);

  const lineProps = useCallback(
    (lineNumber: number) => {
      const hits = byLine.get(lineNumber);
      const isHi = highlightLine === lineNumber;
      const worst = hits?.length ? sortBySeverity(hits)[0].severity : null;
      const classes = [
        "code-line",
        isHi ? "code-line-highlight" : "",
        worst ? `code-line-finding ${SEV_GUTTER[worst]}` : "",
      ]
        .filter(Boolean)
        .join(" ");

      return {
        className: classes,
        "data-line": lineNumber,
        title: hits?.map((h) => `[${h.severity}] ${h.title}`).join("\n"),
        onClick: hits?.length ? () => onAnnotationClick?.(lineNumber) : undefined,
        style: hits?.length ? { cursor: "pointer" } : undefined,
      };
    },
    [byLine, highlightLine, onAnnotationClick]
  );

  useEffect(() => {
    if (highlightLine == null || !scrollRef.current) return;
    const el = scrollRef.current.querySelector(
      `[data-line="${highlightLine}"]`
    ) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [highlightLine, code]);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  }, [code]);

  const onDownload = useCallback(() => {
    const name =
      downloadName ||
      filename ||
      `code.${language === "python" ? "py" : language === "typescript" ? "ts" : "js"}`;
    downloadText(name.split("/").pop() || name, code);
  }, [code, downloadName, filename, language]);

  const prismLang = toPrismLanguage(language);
  const lines = code ? code.split("\n").length : 0;
  const annCount = byLine.size;

  return (
    <div className="code-block code-block-focus glass-panel group relative flex h-full min-h-0 flex-col overflow-hidden border border-[var(--border)] bg-[var(--code-bg)]">
      <div className="code-block-toolbar flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border)] px-2 py-1">
        <span className="min-w-0 truncate font-mono text-[10px] text-[var(--muted)]">
          {filename ? filename : prismLang}
          {lines > 0 && (
            <span className="ml-2 text-[var(--muted-2)]">{lines}L</span>
          )}
          {annCount > 0 && (
            <span className="ml-2 text-[var(--danger)]">{annCount}·</span>
          )}
        </span>

        {compactToolbar ? (
          <div className="relative flex shrink-0 items-center gap-0.5" ref={menuRef}>
            <button
              type="button"
              onClick={onCopy}
              className={toolBtn}
              title="Copy"
            >
              {copied ? "ok" : "copy"}
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className={menuOpen ? toolBtnOn : toolBtn}
              title="More"
            >
              ···
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-30 mt-1 min-w-[8rem] border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg">
                {onToggleFind && (
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left font-mono text-[10px] text-[var(--fg-dim)] hover:bg-[var(--surface-2)] hover:text-[var(--accent)]"
                    onClick={() => {
                      onToggleFind();
                      setMenuOpen(false);
                    }}
                  >
                    Find {showFind ? "· on" : ""}
                  </button>
                )}
                <button
                  type="button"
                  className="block w-full px-3 py-1.5 text-left font-mono text-[10px] text-[var(--fg-dim)] hover:bg-[var(--surface-2)] hover:text-[var(--accent)]"
                  onClick={() => {
                    setWrap((w) => !w);
                    setMenuOpen(false);
                  }}
                >
                  Wrap {wrap ? "· on" : ""}
                </button>
                {onFontSizeChange && (
                  <>
                    <button
                      type="button"
                      className="block w-full px-3 py-1.5 text-left font-mono text-[10px] text-[var(--fg-dim)] hover:bg-[var(--surface-2)] hover:text-[var(--accent)]"
                      onClick={() => onFontSizeChange(Math.max(10, fontSize - 1))}
                    >
                      Smaller type
                    </button>
                    <button
                      type="button"
                      className="block w-full px-3 py-1.5 text-left font-mono text-[10px] text-[var(--fg-dim)] hover:bg-[var(--surface-2)] hover:text-[var(--accent)]"
                      onClick={() => onFontSizeChange(Math.min(18, fontSize + 1))}
                    >
                      Larger type
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="block w-full px-3 py-1.5 text-left font-mono text-[10px] text-[var(--fg-dim)] hover:bg-[var(--surface-2)] hover:text-[var(--accent)]"
                  onClick={() => {
                    onDownload();
                    setMenuOpen(false);
                  }}
                >
                  Save file
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-0.5">
            {onFontSizeChange && (
              <div className="mr-0.5 flex items-stretch border border-[var(--border)]">
                <button
                  type="button"
                  className={`${toolBtn} border-0 border-r`}
                  onClick={() => onFontSizeChange(Math.max(10, fontSize - 1))}
                >
                  a−
                </button>
                <button
                  type="button"
                  className={`${toolBtn} border-0`}
                  onClick={() => onFontSizeChange(Math.min(18, fontSize + 1))}
                >
                  a+
                </button>
              </div>
            )}
            {onToggleFind && (
              <button
                type="button"
                onClick={onToggleFind}
                className={showFind ? toolBtnOn : toolBtn}
              >
                find
              </button>
            )}
            <button
              type="button"
              onClick={() => setWrap((w) => !w)}
              className={wrap ? toolBtnOn : toolBtn}
            >
              wrap
            </button>
            <button type="button" onClick={onDownload} className={toolBtn}>
              save
            </button>
            <button type="button" onClick={onCopy} className={toolBtn}>
              {copied ? "ok" : "copy"}
            </button>
          </div>
        )}
      </div>
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-auto"
        style={{ maxHeight }}
      >
        <SyntaxHighlighter
          language={prismLang}
          style={prismThemeFor(uiTheme)}
          showLineNumbers={showLineNumbers}
          wrapLines
          wrapLongLines={wrap}
          lineProps={lineProps}
          customStyle={{
            margin: 0,
            padding: "10px 0",
            background: "transparent",
            fontSize: `${fontSize}px`,
            lineHeight: "1.55",
            minHeight: "100%",
            whiteSpace: wrap ? "pre-wrap" : "pre",
            wordBreak: wrap ? "break-word" : "normal",
          }}
          lineNumberStyle={{
            minWidth: "2.75em",
            paddingRight: "0.85em",
            color: lineNumberColor(uiTheme),
            userSelect: "none",
          }}
          codeTagProps={{
            style: {
              fontFamily: "var(--font-plex-mono), ui-monospace, monospace",
            },
          }}
        >
          {code || " "}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
