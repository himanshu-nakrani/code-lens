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

/** High-contrast light theme for paper / glacier UI. */
export const glacierPrism: PrismTheme = {
  'code[class*="language-"]': {
    color: "#1e293b",
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
    color: "#1e293b",
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
  comment: { color: "#64748b", fontStyle: "italic" },
  prolog: { color: "#64748b" },
  doctype: { color: "#64748b" },
  cdata: { color: "#64748b" },
  punctuation: { color: "#475569" },
  namespace: { opacity: 0.85 },
  property: { color: "#1d4ed8" },
  tag: { color: "#1d4ed8" },
  boolean: { color: "#7c3aed" },
  number: { color: "#7c3aed" },
  constant: { color: "#7c3aed" },
  symbol: { color: "#7c3aed" },
  deleted: { color: "#dc2626" },
  selector: { color: "#0f766e" },
  "attr-name": { color: "#0f766e" },
  string: { color: "#15803d" },
  char: { color: "#15803d" },
  builtin: { color: "#0f766e" },
  inserted: { color: "#15803d" },
  operator: { color: "#2563eb" },
  entity: { color: "#2563eb", cursor: "help" },
  url: { color: "#2563eb" },
  ".language-css .token.string": { color: "#15803d" },
  ".style .token.string": { color: "#15803d" },
  atrule: { color: "#b45309" },
  "attr-value": { color: "#b45309" },
  keyword: { color: "#1e40af" },
  function: { color: "#0369a1" },
  "class-name": { color: "#a16207" },
  regex: { color: "#be123c" },
  important: { color: "#be123c", fontWeight: "bold" },
  variable: { color: "#be123c" },
  bold: { fontWeight: "bold" },
  italic: { fontStyle: "italic" },
};

export function prismThemeFor(theme: ThemeId): PrismTheme {
  return theme === "light" ? glacierPrism : sapphirePrism;
}

export function lineNumberColor(theme: ThemeId): string {
  return theme === "light" ? "#94a3b8" : "#3d5275";
}
