/**
 * Server-only GitHub repository ingest via the GitHub REST API.
 * Never import from client components.
 */

import "server-only";

import { detectLanguage, isTextSourceFile } from "./languages";
import {
  pathInSubdir,
  shouldSkipGitHubPath,
  stripSubdirPrefix,
  type ParsedGitHubRepo,
} from "./github-url";
import {
  isLikelyBinaryContent,
  MAX_FILE_BYTES,
  MAX_FILES,
  MAX_TOTAL_BYTES,
  formatBytes,
} from "./files";
import type { CodeFile } from "./types";

const GITHUB_API = "https://api.github.com";
const USER_AGENT = "code-lens-analyzer";

export type GitHubIngestOk = {
  ok: true;
  repo: {
    owner: string;
    name: string;
    ref: string;
    defaultBranch: string;
    htmlUrl: string;
    private: boolean;
  };
  files: CodeFile[];
  skipped: string[];
  truncated: string[];
  warnings: string[];
};

export type GitHubIngestErr = {
  ok: false;
  error: string;
  status: number;
};

export type GitHubIngestResult = GitHubIngestOk | GitHubIngestErr;

type TreeEntry = {
  path?: string;
  mode?: string;
  type?: string;
  sha?: string;
  size?: number;
  url?: string;
};

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": USER_AGENT,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function ghJson<T>(
  url: string,
  init?: RequestInit
): Promise<{ ok: true; data: T; status: number } | { ok: false; status: number; message: string }> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        ...authHeaders(),
        ...(init?.headers as Record<string, string> | undefined),
      },
      // Avoid Next fetch cache for live repo state
      cache: "no-store",
    });
  } catch (e) {
    return {
      ok: false,
      status: 502,
      message: e instanceof Error ? e.message : "Network error talking to GitHub.",
    };
  }

  if (!res.ok) {
    let message = res.statusText || "GitHub request failed";
    try {
      const body = (await res.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      /* ignore */
    }
    if (res.status === 404) {
      message =
        "Repository not found. Check the URL, or set GITHUB_TOKEN for private repos.";
    } else if (res.status === 403 || res.status === 429) {
      message =
        message +
        " (rate limited — set GITHUB_TOKEN for higher limits, or wait and retry)";
    } else if (res.status === 401) {
      message = "GitHub authentication failed. Check GITHUB_TOKEN.";
    }
    return { ok: false, status: res.status, message };
  }

  try {
    const data = (await res.json()) as T;
    return { ok: true, data, status: res.status };
  } catch {
    return { ok: false, status: 502, message: "Invalid JSON from GitHub." };
  }
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  const n = Math.min(concurrency, Math.max(1, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

export async function ingestGitHubRepo(
  parsed: ParsedGitHubRepo
): Promise<GitHubIngestResult> {
  const { owner, repo } = parsed;

  const metaRes = await ghJson<{
    name: string;
    full_name: string;
    private: boolean;
    default_branch: string;
    html_url: string;
    size?: number;
  }>(`${GITHUB_API}/repos/${owner}/${repo}`);

  if (!metaRes.ok) {
    return { ok: false, error: metaRes.message, status: metaRes.status >= 400 ? metaRes.status : 502 };
  }

  const defaultBranch = metaRes.data.default_branch || "main";
  const ref = parsed.ref || defaultBranch;
  const subdir = parsed.subdir;

  const treeRes = await ghJson<{
    tree?: TreeEntry[];
    truncated?: boolean;
    sha?: string;
  }>(`${GITHUB_API}/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`);

  if (!treeRes.ok) {
    // Trees endpoint sometimes wants the commit SHA; try resolving ref
    if (treeRes.status === 404) {
      return {
        ok: false,
        error: `Branch or ref "${ref}" not found in ${owner}/${repo}.`,
        status: 404,
      };
    }
    return {
      ok: false,
      error: treeRes.message,
      status: treeRes.status >= 400 ? treeRes.status : 502,
    };
  }

  const tree = Array.isArray(treeRes.data.tree) ? treeRes.data.tree : [];
  const warnings: string[] = [];
  const skipped: string[] = [];
  const truncated: string[] = [];

  if (treeRes.data.truncated) {
    warnings.push(
      "GitHub tree response was truncated; very large repos may miss some files."
    );
  }

  type Candidate = { path: string; size: number };
  const candidates: Candidate[] = [];

  for (const entry of tree) {
    if (entry.type !== "blob" || !entry.path) continue;
    if (!pathInSubdir(entry.path, subdir)) continue;
    if (shouldSkipGitHubPath(entry.path)) {
      skipped.push(`${entry.path} (ignored path)`);
      continue;
    }
    if (!isTextSourceFile(entry.path)) {
      skipped.push(`${entry.path} (binary or unsupported type)`);
      continue;
    }
    const size = typeof entry.size === "number" ? entry.size : 0;
    if (size > MAX_FILE_BYTES) {
      skipped.push(
        `${entry.path} (${formatBytes(size)} exceeds ${formatBytes(MAX_FILE_BYTES)} limit)`
      );
      continue;
    }
    candidates.push({ path: entry.path, size });
  }

  // Prefer smaller source files first so we pack more under the total cap
  candidates.sort((a, b) => a.size - b.size || a.path.localeCompare(b.path));

  const selected: Candidate[] = [];
  let plannedBytes = 0;
  for (const c of candidates) {
    if (selected.length >= MAX_FILES) {
      warnings.push(`Stopped after ${MAX_FILES} files (demo limit).`);
      break;
    }
    const size = c.size || 1;
    if (plannedBytes + size > MAX_TOTAL_BYTES) {
      skipped.push(`${c.path} (total size cap)`);
      continue;
    }
    selected.push(c);
    plannedBytes += size;
  }

  if (candidates.length > selected.length && !warnings.some((w) => /Stopped after/.test(w))) {
    const omitted = candidates.length - selected.length;
    if (omitted > 0) {
      warnings.push(
        `${omitted} file${omitted === 1 ? "" : "s"} omitted by size/count caps.`
      );
    }
  }

  if (selected.length === 0) {
    return {
      ok: false,
      error: subdir
        ? `No text/source files found under "${subdir}" in ${owner}/${repo}@${ref}.`
        : `No text/source files found in ${owner}/${repo}@${ref}.`,
      status: 422,
    };
  }

  // Fetch contents — Contents API works for private repos with token
  type Fetched =
    | { path: string; content: string; ok: true }
    | { path: string; ok: false; reason: string };

  const fetched = await mapPool(selected, 8, async (c): Promise<Fetched> => {
    const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${c.path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}?ref=${encodeURIComponent(ref)}`;

    const res = await ghJson<{
      type?: string;
      encoding?: string;
      content?: string;
      size?: number;
      download_url?: string | null;
    }>(url);

    if (!res.ok) {
      return { path: c.path, ok: false, reason: res.message };
    }

    let text = "";
    if (res.data.encoding === "base64" && typeof res.data.content === "string") {
      try {
        text = Buffer.from(res.data.content.replace(/\n/g, ""), "base64").toString(
          "utf8"
        );
      } catch {
        return { path: c.path, ok: false, reason: "base64 decode failed" };
      }
    } else if (res.data.download_url) {
      try {
        const raw = await fetch(res.data.download_url, {
          headers: authHeaders(),
          cache: "no-store",
        });
        if (!raw.ok) {
          return { path: c.path, ok: false, reason: `download ${raw.status}` };
        }
        text = await raw.text();
      } catch (e) {
        return {
          path: c.path,
          ok: false,
          reason: e instanceof Error ? e.message : "download failed",
        };
      }
    } else {
      return { path: c.path, ok: false, reason: "no content payload" };
    }

    if (isLikelyBinaryContent(text)) {
      return { path: c.path, ok: false, reason: "detected binary content" };
    }

    const maxChars = 120_000;
    if (text.length > maxChars) {
      text = text.slice(0, maxChars) + "\n\n/* … truncated by Code Lens … */\n";
    }

    return { path: c.path, content: text, ok: true };
  });

  const files: CodeFile[] = [];
  let totalBytes = 0;

  for (const item of fetched) {
    if (!item.ok) {
      skipped.push(`${item.path} (${item.reason})`);
      continue;
    }
    const content = item.content;
    const wasTruncated = content.includes("/* … truncated by Code Lens … */");
    if (wasTruncated) truncated.push(item.path);

    const size = new TextEncoder().encode(content).length;
    if (totalBytes + size > MAX_TOTAL_BYTES) {
      skipped.push(`${item.path} (total size cap)`);
      continue;
    }
    if (files.length >= MAX_FILES) {
      skipped.push(`${item.path} (file count cap)`);
      continue;
    }

    const relPath = stripSubdirPrefix(item.path, subdir);
    const name = relPath.split("/").pop() || relPath;
    const language = detectLanguage(name);
    totalBytes += size;

    files.push({
      id: `gh-${owner}-${repo}-${ref}-${item.path}`,
      name,
      path: relPath,
      content,
      language,
      size,
    });
  }

  files.sort((a, b) => a.path.localeCompare(b.path));

  if (files.length === 0) {
    return {
      ok: false,
      error: "Could not load any file contents from that repository.",
      status: 422,
    };
  }

  return {
    ok: true,
    repo: {
      owner,
      name: metaRes.data.name || repo,
      ref,
      defaultBranch,
      htmlUrl: metaRes.data.html_url || parsed.htmlUrl,
      private: Boolean(metaRes.data.private),
    },
    files,
    skipped,
    truncated,
    warnings,
  };
}
