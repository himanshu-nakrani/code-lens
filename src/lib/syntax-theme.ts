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

/** Dim Paper Glacier ink — low-luminance paper, soft token contrast. */
export const glacierPrism: PrismTheme = {
  'code[class*="language-"]': {
    color: "#243040",
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
    color: "#243040",
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
  comment: { color: "#5e6d82", fontStyle: "italic" },
  prolog: { color: "#5e6d82" },
  doctype: { color: "#5e6d82" },
  cdata: { color: "#5e6d82" },
  punctuation: { color: "#4e5c72" },
  namespace: { opacity: 0.85 },
  property: { color: "#355fba" },
  tag: { color: "#355fba" },
  boolean: { color: "#5f5296" },
  number: { color: "#5f5296" },
  constant: { color: "#5f5296" },
  symbol: { color: "#5f5296" },
  deleted: { color: "#b03545" },
  selector: { color: "#0b5c56" },
  "attr-name": { color: "#0b5c56" },
  string: { color: "#286844" },
  char: { color: "#286844" },
  builtin: { color: "#0b5c56" },
  inserted: { color: "#286844" },
  operator: { color: "#355fba" },
  entity: { color: "#355fba", cursor: "help" },
  url: { color: "#355fba" },
  ".language-css .token.string": { color: "#286844" },
  ".style .token.string": { color: "#286844" },
  atrule: { color: "#8f5010" },
  "attr-value": { color: "#8f5010" },
  keyword: { color: "#2a4f9e" },
  function: { color: "#1a5c84" },
  "class-name": { color: "#7a5e18" },
  regex: { color: "#943548" },
  important: { color: "#943548", fontWeight: "bold" },
  variable: { color: "#943548" },
  bold: { fontWeight: "bold" },
  italic: { fontStyle: "italic" },
};

export function prismThemeFor(theme: ThemeId): PrismTheme {
  return theme === "light" ? glacierPrism : sapphirePrism;
}

export function lineNumberColor(theme: ThemeId): string {
  return theme === "light" ? "#7a8aa0" : "#3d5275";
}
