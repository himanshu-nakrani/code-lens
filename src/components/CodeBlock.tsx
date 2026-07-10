"use client";

import { useState, useCallback } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { toPrismLanguage } from "@/lib/languages";
import { downloadText } from "@/lib/export";

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
}

const toolBtn =
  "border border-[var(--border)] bg-[var(--bg)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[var(--muted)] transition hover:border-[var(--border-bright)] hover:text-[var(--fg)]";
const toolBtnOn =
  "border border-[var(--accent-border)] bg-[var(--accent-dim)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[var(--accent)]";

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
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [wrap, setWrap] = useState(false);

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

  return (
    <div className="code-block code-block-focus group relative flex h-full min-h-0 flex-col overflow-hidden border border-[var(--border)] bg-[var(--code-bg)]">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-2 py-1">
        <span className="min-w-0 truncate font-mono text-[10px] text-[var(--muted)]">
          {filename ? filename : prismLang}
          {lines > 0 && (
            <span className="ml-2 text-[var(--muted-2)]">{lines}L</span>
          )}
        </span>
        <div className="flex shrink-0 items-center gap-0.5">
          {onFontSizeChange && (
            <div className="mr-0.5 flex items-stretch border border-[var(--border)]">
              <button
                type="button"
                className={`${toolBtn} border-0 border-r`}
                onClick={() => onFontSizeChange(Math.max(10, fontSize - 1))}
                title="Smaller"
              >
                a−
              </button>
              <button
                type="button"
                className={`${toolBtn} border-0`}
                onClick={() => onFontSizeChange(Math.min(18, fontSize + 1))}
                title="Larger"
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
              title="Find in file (⌘F)"
            >
              find
            </button>
          )}
          <button
            type="button"
            onClick={() => setWrap((w) => !w)}
            className={wrap ? toolBtnOn : toolBtn}
            title="Toggle word wrap"
          >
            wrap
          </button>
          <button type="button" onClick={onDownload} className={toolBtn} title="Download">
            save
          </button>
          <button type="button" onClick={onCopy} className={toolBtn}>
            {copied ? "ok" : "copy"}
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto" style={{ maxHeight }}>
        <SyntaxHighlighter
          language={prismLang}
          style={oneDark}
          showLineNumbers={showLineNumbers}
          wrapLongLines={wrap}
          customStyle={{
            margin: 0,
            padding: "10px 0",
            background: "transparent",
            fontSize: `${fontSize}px`,
            lineHeight: "1.5",
            minHeight: "100%",
            whiteSpace: wrap ? "pre-wrap" : "pre",
            wordBreak: wrap ? "break-word" : "normal",
          }}
          lineNumberStyle={{
            minWidth: "2.75em",
            paddingRight: "0.85em",
            color: "#3d4450",
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
