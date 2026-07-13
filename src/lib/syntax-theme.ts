/**
 * Prism themes for Code Lens.
 * Dark: Glass Sapphire · Light: Paper Glacier ink
 */

import type { CSSProperties } from "react";
import type { ThemeId } from "./theme";

type PrismTheme = { [key: string]: CSSProperties };

const baseMono = 'var(--font-plex-mono), ui-monospace, monospace';

export const sapphirePrism: PrismTheme = {
  'code[class*="language-"]': {
    color: "#d6e2f5",
    background: "none",
    fontFamily: baseMono,
    textAlign: "left",
    whiteSpace: "pre",
    wordSpacing: "normal",
    wordBreak: "normal",
    wordWrap: "normal",
    lineHeight: "1.5",
    tabSize: 2,
    hyphens: "none",
  },
  'pre[class*="language-"]': {
    color: "#d6e2f5",
    background: "transparent",
    fontFamily: baseMono,
    textAlign: "left",
    whiteSpace: "pre",
    wordSpacing: "normal",
    wordBreak: "normal",
    wordWrap: "normal",
    lineHeight: "1.5",
    tabSize: 2,
    hyphens: "none",
    padding: "1em",
    margin: "0",
    overflow: "auto",
  },
  comment: { color: "#5c6f8c", fontStyle: "italic" },
  prolog: { color: "#5c6f8c" },
  doctype: { color: "#5c6f8c" },
  cdata: { color: "#5c6f8c" },
  punctuation: { color: "#8ba0bf" },
  namespace: { opacity: 0.75 },
  property: { color: "#7eb6ff" },
  tag: { color: "#7eb6ff" },
  boolean: { color: "#c4a5ff" },
  number: { color: "#c4a5ff" },
  constant: { color: "#c4a5ff" },
  symbol: { color: "#c4a5ff" },
  deleted: { color: "#ff6b8a" },
  selector: { color: "#5eead4" },
  "attr-name": { color: "#5eead4" },
  string: { color: "#9ddea8" },
  char: { color: "#9ddea8" },
  builtin: { color: "#5eead4" },
  inserted: { color: "#5eead4" },
  operator: { color: "#89b8ff" },
  entity: { color: "#89b8ff", cursor: "help" },
  url: { color: "#89b8ff" },
  ".language-css .token.string": { color: "#9ddea8" },
  ".style .token.string": { color: "#9ddea8" },
  atrule: { color: "#f5c15a" },
  "attr-value": { color: "#f5c15a" },
  keyword: { color: "#9db8ff" },
  function: { color: "#6ec8ff" },
  "class-name": { color: "#f0c36a" },
  regex: { color: "#ff9eb5" },
  important: { color: "#ff9eb5", fontWeight: "bold" },
  variable: { color: "#ff9eb5" },
  bold: { fontWeight: "bold" },
  italic: { fontStyle: "italic" },
};

/** Soft Paper Glacier ink — muted on mist paper, not high-contrast white. */
export const glacierPrism: PrismTheme = {
  'code[class*="language-"]': {
    color: "#2a3548",
    background: "none",
    fontFamily: baseMono,
    textAlign: "left",
    whiteSpace: "pre",
    wordSpacing: "normal",
    wordBreak: "normal",
    wordWrap: "normal",
    lineHeight: "1.5",
    tabSize: 2,
    hyphens: "none",
  },
  'pre[class*="language-"]': {
    color: "#2a3548",
    background: "transparent",
    fontFamily: baseMono,
    textAlign: "left",
    whiteSpace: "pre",
    wordSpacing: "normal",
    wordBreak: "normal",
    wordWrap: "normal",
    lineHeight: "1.5",
    tabSize: 2,
    hyphens: "none",
    padding: "1em",
    margin: "0",
    overflow: "auto",
  },
  comment: { color: "#6b7a90", fontStyle: "italic" },
  prolog: { color: "#6b7a90" },
  doctype: { color: "#6b7a90" },
  cdata: { color: "#6b7a90" },
  punctuation: { color: "#5a6880" },
  namespace: { opacity: 0.85 },
  property: { color: "#3a6fd0" },
  tag: { color: "#3a6fd0" },
  boolean: { color: "#6d5aad" },
  number: { color: "#6d5aad" },
  constant: { color: "#6d5aad" },
  symbol: { color: "#6d5aad" },
  deleted: { color: "#c23b4a" },
  selector: { color: "#0d6b64" },
  "attr-name": { color: "#0d6b64" },
  string: { color: "#2f7a4a" },
  char: { color: "#2f7a4a" },
  builtin: { color: "#0d6b64" },
  inserted: { color: "#2f7a4a" },
  operator: { color: "#3a6fd0" },
  entity: { color: "#3a6fd0", cursor: "help" },
  url: { color: "#3a6fd0" },
  ".language-css .token.string": { color: "#2f7a4a" },
  ".style .token.string": { color: "#2f7a4a" },
  atrule: { color: "#a05a12" },
  "attr-value": { color: "#a05a12" },
  keyword: { color: "#2f5fba" },
  function: { color: "#1f6a96" },
  "class-name": { color: "#8a6a1a" },
  regex: { color: "#a83a52" },
  important: { color: "#a83a52", fontWeight: "bold" },
  variable: { color: "#a83a52" },
  bold: { fontWeight: "bold" },
  italic: { fontStyle: "italic" },
};

export function prismThemeFor(theme: ThemeId): PrismTheme {
  return theme === "light" ? glacierPrism : sapphirePrism;
}

export function lineNumberColor(theme: ThemeId): string {
  return theme === "light" ? "#8b9bb2" : "#3d5275";
}
