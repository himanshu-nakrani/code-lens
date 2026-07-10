/** Map file extension → Prism/language id used by highlighter + prompts */
const EXT_TO_LANG: Record<string, string> = {
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  tsx: "tsx",
  py: "python",
  rb: "ruby",
  go: "go",
  rs: "rust",
  java: "java",
  kt: "kotlin",
  kts: "kotlin",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  cs: "csharp",
  php: "php",
  swift: "swift",
  scala: "scala",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  json: "json",
  yml: "yaml",
  yaml: "yaml",
  md: "markdown",
  markdown: "markdown",
  html: "html",
  htm: "html",
  css: "css",
  scss: "scss",
  less: "less",
  sql: "sql",
  graphql: "graphql",
  gql: "graphql",
  vue: "markup",
  svelte: "markup",
  xml: "xml",
  toml: "toml",
  ini: "ini",
  env: "bash",
  dockerfile: "docker",
  r: "r",
  lua: "lua",
  pl: "perl",
  pm: "perl",
  dart: "dart",
  elm: "elm",
  ex: "elixir",
  exs: "elixir",
  erl: "erlang",
  hs: "haskell",
  clj: "clojure",
  cljs: "clojure",
  zig: "zig",
  txt: "text",
};

const TEXT_EXTENSIONS = new Set(Object.keys(EXT_TO_LANG));

/** Extra extensions treated as text even without a highlighter map */
const EXTRA_TEXT = new Set([
  "gitignore",
  "dockerignore",
  "editorconfig",
  "nvmrc",
  "npmrc",
  "lock",
  "log",
  "csv",
  "tsv",
  "svg",
  "conf",
  "cfg",
  "properties",
  "gradle",
  "makefile",
  "cmake",
  "proto",
  "tf",
  "hcl",
]);

const BINARY_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "ico", "bmp", "svgz",
  "woff", "woff2", "ttf", "otf", "eot",
  "mp3", "mp4", "wav", "ogg", "webm", "mov", "avi",
  "zip", "tar", "gz", "bz2", "7z", "rar", "xz",
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "exe", "dll", "so", "dylib", "bin", "o", "a", "class", "pyc", "pyo",
  "wasm", "map",
]);

export function getExtension(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  if (base.toLowerCase() === "dockerfile" || base.toLowerCase() === "makefile") {
    return base.toLowerCase();
  }
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "";
  return base.slice(dot + 1).toLowerCase();
}

export function detectLanguage(filename: string): string {
  const ext = getExtension(filename);
  if (!ext) return "text";
  return EXT_TO_LANG[ext] ?? "text";
}

export function isTextSourceFile(filename: string): boolean {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  const lower = base.toLowerCase();
  if (lower === "dockerfile" || lower === "makefile" || lower === ".gitignore" || lower === ".env") {
    return true;
  }
  const ext = getExtension(filename);
  if (!ext) return false;
  if (BINARY_EXTENSIONS.has(ext)) return false;
  return TEXT_EXTENSIONS.has(ext) || EXTRA_TEXT.has(ext);
}

/** Prism language aliases that may need remapping for react-syntax-highlighter */
export function toPrismLanguage(lang: string): string {
  const map: Record<string, string> = {
    text: "text",
    tsx: "tsx",
    jsx: "jsx",
    typescript: "typescript",
    javascript: "javascript",
    python: "python",
    bash: "bash",
    shell: "bash",
    docker: "docker",
    csharp: "csharp",
  };
  return map[lang] ?? lang;
}
