/**
 * Pure GitHub URL / shorthand parsing — no network I/O.
 */

export type ParsedGitHubRepo = {
  owner: string;
  repo: string;
  /** Branch, tag, or commit SHA when present in the URL */
  ref?: string;
  /** Optional subdirectory from /tree/{ref}/path */
  subdir?: string;
  /** Canonical https URL without .git */
  htmlUrl: string;
};

/**
 * Accepts:
 * - owner/repo
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - https://github.com/owner/repo/tree/branch
 * - https://github.com/owner/repo/tree/branch/src/lib
 * - github.com/owner/repo
 */
export function parseGitHubInput(raw: string):
  | { ok: true; value: ParsedGitHubRepo }
  | { ok: false; error: string } {
  let s = (raw ?? "").trim();
  if (!s) {
    return { ok: false, error: "Enter a GitHub repository URL or owner/repo." };
  }

  // Strip trailing slashes and .git
  s = s.replace(/\/+$/, "").replace(/\.git$/i, "");

  // Shorthand owner/repo
  if (!s.includes("://") && !s.startsWith("github.com")) {
    const m = s.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\/(.*))?$/);
    if (!m) {
      return {
        ok: false,
        error: "Use owner/repo or a full github.com URL.",
      };
    }
    const owner = m[1];
    const repo = m[2];
    const rest = m[3];
    let ref: string | undefined;
    let subdir: string | undefined;
    if (rest) {
      // owner/repo/tree/branch/path or owner/repo@branch
      if (rest.startsWith("tree/")) {
        const parts = rest.slice(5).split("/");
        ref = parts[0] || undefined;
        if (parts.length > 1) subdir = parts.slice(1).join("/");
      } else if (rest.startsWith("@")) {
        ref = rest.slice(1) || undefined;
      }
    }
    return {
      ok: true,
      value: {
        owner,
        repo,
        ref,
        subdir: subdir || undefined,
        htmlUrl: `https://github.com/${owner}/${repo}`,
      },
    };
  }

  // Normalize host-only prefix
  if (s.startsWith("github.com/")) {
    s = "https://" + s;
  }

  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return { ok: false, error: "Could not parse that as a URL." };
  }

  if (!/^(www\.)?github\.com$/i.test(url.hostname)) {
    return { ok: false, error: "Only github.com repositories are supported." };
  }

  const segments = url.pathname
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .split("/")
    .filter(Boolean)
    .map((p) => decodeURIComponent(p));

  if (segments.length < 2) {
    return { ok: false, error: "URL must include owner and repository name." };
  }

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/i, "");
  let ref: string | undefined;
  let subdir: string | undefined;

  // /owner/repo/tree/ref[/path…]
  // /owner/repo/blob/ref/path
  // /owner/repo/commit/sha
  if (segments[2] === "tree" && segments[3]) {
    ref = segments[3];
    if (segments.length > 4) subdir = segments.slice(4).join("/");
  } else if (segments[2] === "blob" && segments[3]) {
    ref = segments[3];
    if (segments.length > 4) {
      // file path → treat parent as subdir focus is awkward; keep full path as single-file subdir hint
      subdir = segments.slice(4, -1).join("/") || undefined;
    }
  } else if (segments[2] === "commit" && segments[3]) {
    ref = segments[3];
  }

  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) {
    return { ok: false, error: "Invalid owner or repository name." };
  }

  return {
    ok: true,
    value: {
      owner,
      repo,
      ref,
      subdir: subdir || undefined,
      htmlUrl: `https://github.com/${owner}/${repo}`,
    },
  };
}

/** Directories skipped when ingesting a remote tree (noise / huge). */
export const SKIP_DIR_SEGMENTS = new Set([
  "node_modules",
  ".git",
  ".svn",
  ".hg",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  ".turbo",
  "coverage",
  "vendor",
  "__pycache__",
  ".venv",
  "venv",
  "target",
  "Pods",
  ".idea",
  ".vscode",
  "bin",
  "obj",
]);

/** Filenames / suffixes to skip even if text-like. */
export const SKIP_BASENAME = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "composer.lock",
  "Cargo.lock",
  "Gemfile.lock",
  "poetry.lock",
  "go.sum",
]);

export function shouldSkipGitHubPath(path: string): boolean {
  const parts = path.split("/").filter(Boolean);
  for (const p of parts) {
    if (SKIP_DIR_SEGMENTS.has(p)) return true;
  }
  const base = parts[parts.length - 1] ?? "";
  if (SKIP_BASENAME.has(base)) return true;
  if (/\.min\.(js|css)$/i.test(base)) return true;
  if (/\.map$/i.test(base)) return true;
  return false;
}

/** True if path is under optional subdir (or no subdir filter). */
export function pathInSubdir(path: string, subdir?: string): boolean {
  if (!subdir) return true;
  const prefix = subdir.replace(/^\/+|\/+$/g, "");
  if (!prefix) return true;
  return path === prefix || path.startsWith(prefix + "/");
}

/** Strip subdir prefix so workspace paths stay relative to the focused folder. */
export function stripSubdirPrefix(path: string, subdir?: string): string {
  if (!subdir) return path;
  const prefix = subdir.replace(/^\/+|\/+$/g, "");
  if (!prefix) return path;
  if (path === prefix) return path.split("/").pop() || path;
  if (path.startsWith(prefix + "/")) return path.slice(prefix.length + 1);
  return path;
}
