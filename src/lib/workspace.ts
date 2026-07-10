import type { AnalysisResult, CodeFile, TaskId } from "./types";

const WORKSPACE_KEY = "code-lens-workspace-v1";
const MAX_PERSIST_BYTES = 400_000; // stay under localStorage pressure

export interface WorkspaceSnapshot {
  files: CodeFile[];
  selectedPath: string | null;
  result: AnalysisResult | null;
  lastTarget: string | null;
  durationMs: number | null;
  tasks: TaskId[];
  savedAt: number;
}

export function saveWorkspace(snap: WorkspaceSnapshot): boolean {
  try {
    const json = JSON.stringify(snap);
    if (json.length > MAX_PERSIST_BYTES) {
      // Drop result payload if too large
      const slim: WorkspaceSnapshot = {
        ...snap,
        result: null,
      };
      const slimJson = JSON.stringify(slim);
      if (slimJson.length > MAX_PERSIST_BYTES) return false;
      localStorage.setItem(WORKSPACE_KEY, slimJson);
      return true;
    }
    localStorage.setItem(WORKSPACE_KEY, json);
    return true;
  } catch {
    return false;
  }
}

export function loadWorkspace(): WorkspaceSnapshot | null {
  try {
    const raw = localStorage.getItem(WORKSPACE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as WorkspaceSnapshot;
    if (!data || !Array.isArray(data.files)) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearWorkspace(): void {
  try {
    localStorage.removeItem(WORKSPACE_KEY);
  } catch {
    /* ignore */
  }
}
