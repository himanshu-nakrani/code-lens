/** Client-side recent GitHub repo list (localStorage). */

export type GitHubRecent = {
  input: string;
  owner: string;
  name: string;
  ref?: string;
  subdir?: string;
  htmlUrl: string;
  at: number;
};

const KEY = "code-lens-github-recents";
export const MAX_GITHUB_RECENTS = 8;

export function loadGitHubRecents(): GitHubRecent[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as GitHubRecent[];
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((r) => r && typeof r.input === "string" && typeof r.owner === "string")
      .slice(0, MAX_GITHUB_RECENTS);
  } catch {
    return [];
  }
}

export function pushGitHubRecent(entry: Omit<GitHubRecent, "at">): GitHubRecent[] {
  const next: GitHubRecent = { ...entry, at: Date.now() };
  const prev = loadGitHubRecents().filter(
    (r) =>
      !(
        r.owner === next.owner &&
        r.name === next.name &&
        (r.ref || "") === (next.ref || "") &&
        (r.subdir || "") === (next.subdir || "")
      )
  );
  const list = [next, ...prev].slice(0, MAX_GITHUB_RECENTS);
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore quota */
  }
  return list;
}
