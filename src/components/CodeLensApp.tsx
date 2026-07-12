"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DropZone } from "./DropZone";
import { FileTree } from "./FileTree";
import { CodeBlock } from "./CodeBlock";
import { CodeSearch } from "./CodeSearch";
import { TaskToggles } from "./TaskToggles";
import { ResultsPanel } from "./ResultsPanel";
import { SampleCards } from "./SampleCards";
import { StatusBar } from "./StatusBar";
import { ToastStack, type ToastMessage } from "./Toast";
import { PasteModal } from "./PasteModal";
import { GitHubModal, type GitHubLoadResult } from "./GitHubModal";
import { ShortcutsModal } from "./ShortcutsModal";
import { CommandPalette, type CommandItem } from "./CommandPalette";
import { LensBackdrop } from "./LensBackdrop";
import { ScanOverlay } from "./ScanOverlay";
import { ApertureLogo } from "./ApertureLogo";
import { Typewriter } from "./Typewriter";
import { FocusHUD } from "./FocusHUD";
import { LockBurst } from "./LockBurst";
import { GrainOverlay } from "./GrainOverlay";
import { FileNav } from "./FileNav";
import { FindingsNav } from "./FindingsNav";
import { SAMPLE_META, SAMPLE_SNIPPETS } from "@/lib/samples";
import { ingestFiles } from "@/lib/files";
import { downloadText, resultToMarkdown } from "@/lib/export";
import { detectLanguage } from "@/lib/languages";
import { analyzeSource } from "@/lib/stats";
import {
  clearWorkspace,
  loadWorkspace,
  saveWorkspace,
} from "@/lib/workspace";
import {
  collectAllFindings,
  findingsWithLines,
  sortBySeverity,
} from "@/lib/findings";
import { buildHistoryEntry, prependHistory, resultToSarif } from "@/lib/history";
import type {
  AnalysisDepth,
  AnalysisHistoryEntry,
  AnalysisResult,
  AnalyzeResponse,
  CodeFile,
  TaskId,
} from "@/lib/types";
import { ALL_TASKS } from "@/lib/types";

/** Calm default: three primary lenses (not the full six). */
const DEFAULT_TASKS: TaskId[] = [
  "explain",
  "fix_bugs",
  "generate_tests",
];

const VALID_TASK_IDS = new Set(ALL_TASKS.map((t) => t.id));

const TASKS_STORAGE_KEY = "code-lens-tasks";
const DEPTH_STORAGE_KEY = "code-lens-depth";

type MobilePane = "files" | "code" | "results";
type ViewerMode = "source" | "fixed";

/** Read task prefs from localStorage — client-only, never use in useState init (SSR mismatch). */
function loadStoredTasks(): Set<TaskId> | null {
  try {
    const raw = localStorage.getItem(TASKS_STORAGE_KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw) as string[];
    const valid = arr.filter((t): t is TaskId => VALID_TASK_IDS.has(t as TaskId));
    return valid.length ? new Set(valid) : null;
  } catch {
    return null;
  }
}

function loadStoredDepth(): AnalysisDepth {
  try {
    const raw = localStorage.getItem(DEPTH_STORAGE_KEY);
    if (raw === "deep" || raw === "standard") return raw;
  } catch {
    /* ignore */
  }
  return "standard";
}

export function CodeLensApp() {
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  // Always start with defaults so server HTML matches first client paint
  const [enabledTasks, setEnabledTasks] = useState<Set<TaskId>>(
    () => new Set(DEFAULT_TASKS)
  );
  const [ingestNotes, setIngestNotes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseError, setParseError] = useState(false);
  const [rawText, setRawText] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [lastTarget, setLastTarget] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [history, setHistory] = useState<AnalysisHistoryEntry[]>([]);
  const [mobilePane, setMobilePane] = useState<MobilePane>("code");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [githubOpen, setGithubOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [fontSize, setFontSize] = useState(12.5);
  const [viewerMode, setViewerMode] = useState<ViewerMode>("source");
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [lockBurstAt, setLockBurstAt] = useState<number | null>(null);
  const [depth, setDepth] = useState<AnalysisDepth>("standard");
  const [highlightLine, setHighlightLine] = useState<number | null>(null);
  const [focusNote, setFocusNote] = useState("");
  const [focusNoteOpen, setFocusNoteOpen] = useState(false);
  const [findingNavIndex, setFindingNavIndex] = useState(0);
  const [workspaceSource, setWorkspaceSource] = useState<string | null>(null);
  const [samplesMenuOpen, setSamplesMenuOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const samplesMenuRef = useRef<HTMLDivElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const toastId = useRef(0);
  const analyzeRef = useRef<() => void>(() => {});
  const loadAndAnalyzeRef = useRef<(s: CodeFile) => void>(() => {});
  const abortRef = useRef<AbortController | null>(null);

  // Client-only restore after mount (avoids SSR/localStorage hydration mismatch)
  useEffect(() => {
    const snap = loadWorkspace();
    if (snap?.files?.length) {
      setFiles(snap.files);
      setSelectedPath(snap.selectedPath);
      if (snap.result) setResult(snap.result);
      if (snap.lastTarget) setLastTarget(snap.lastTarget);
      if (snap.durationMs != null) setDurationMs(snap.durationMs);
      if (snap.tasks?.length) {
        setEnabledTasks(new Set(snap.tasks));
      } else {
        const stored = loadStoredTasks();
        if (stored) setEnabledTasks(stored);
      }
      setIngestNotes([
        `Restored workspace (${snap.files.length} file${snap.files.length === 1 ? "" : "s"})`,
      ]);
    } else {
      const stored = loadStoredTasks();
      if (stored) setEnabledTasks(stored);
    }
    setDepth(loadStoredDepth());
    setHydrated(true);
  }, []);

  // Persist workspace
  useEffect(() => {
    if (!hydrated) return;
    if (files.length === 0) {
      clearWorkspace();
      return;
    }
    saveWorkspace({
      files,
      selectedPath,
      result,
      lastTarget,
      durationMs,
      tasks: Array.from(enabledTasks),
      savedAt: Date.now(),
    });
  }, [hydrated, files, selectedPath, result, lastTarget, durationMs, enabledTasks]);

  // Health check
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d: { hasKey?: boolean }) => setHasApiKey(Boolean(d.hasKey)))
      .catch(() => setHasApiKey(null));
  }, []);

  // Close calm overflow menus on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (samplesMenuRef.current && !samplesMenuRef.current.contains(t)) {
        setSamplesMenuOpen(false);
      }
      if (addMenuRef.current && !addMenuRef.current.contains(t)) {
        setAddMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Auto-dismiss ingest banner after a few seconds
  useEffect(() => {
    if (ingestNotes.length === 0) return;
    const id = window.setTimeout(() => setIngestNotes([]), 4500);
    return () => window.clearTimeout(id);
  }, [ingestNotes]);

  const selectedFile = useMemo(
    () => (selectedPath ? files.find((f) => f.path === selectedPath) ?? null : null),
    [files, selectedPath]
  );

  const fixedCode = result?.bug_fixes?.fixed_code ?? "";
  const showingFixed = viewerMode === "fixed" && Boolean(fixedCode);
  const viewerCode = showingFixed ? fixedCode : selectedFile?.content ?? "";
  const viewerLang = selectedFile?.language ?? "text";
  const viewerName = selectedFile?.path ?? (files.length ? "codebase" : "");
  const lineCount = useMemo(
    () => (viewerCode ? viewerCode.split("\n").length : 0),
    [viewerCode]
  );
  const totalBytes = useMemo(
    () => files.reduce((sum, f) => sum + f.size, 0),
    [files]
  );
  const sourceStats = useMemo(() => {
    if (!selectedFile) return null;
    return analyzeSource(selectedFile.content, selectedFile.language);
  }, [selectedFile]);

  // Only persist after client hydrate so defaults do not clobber stored prefs
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(Array.from(enabledTasks)));
    } catch {
      /* ignore */
    }
  }, [enabledTasks, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(DEPTH_STORAGE_KEY, depth);
    } catch {
      /* ignore */
    }
  }, [depth, hydrated]);

  const annotations = useMemo(
    () => (result && !showingFixed ? collectAllFindings(result) : []),
    [result, showingFixed]
  );
  const lineFindings = useMemo(
    () =>
      sortBySeverity(findingsWithLines(annotations)).filter(
        (f) => typeof f.line === "number" && f.line > 0
      ),
    [annotations]
  );
  const markedLines = lineFindings.length;

  const selectPath = useCallback((path: string | null) => {
    setSelectedPath(path);
    setViewerMode("source");
    setFindOpen(false);
    setHighlightLine(null);
  }, []);

  const jumpToLine = useCallback((line: number) => {
    setHighlightLine(line);
    setViewerMode("source");
    setMobilePane("code");
    setFindOpen(false);
  }, []);

  const jumpToFinding = useCallback(
    (index: number, line: number) => {
      setFindingNavIndex(index);
      jumpToLine(line);
    },
    [jumpToLine]
  );

  const pushToast = useCallback((kind: ToastMessage["kind"], text: string) => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev.slice(-4), { id, kind, text }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const restoreHistory = useCallback(
    (entry: AnalysisHistoryEntry) => {
      setResult(entry.result);
      setLastTarget(entry.target);
      setDurationMs(entry.durationMs);
      setDepth(entry.depth);
      if (entry.focusNote) {
        setFocusNote(entry.focusNote);
        setFocusNoteOpen(true);
      }
      setEnabledTasks(new Set(entry.tasks));
      setError(null);
      setParseError(false);
      setRawText(null);
      setFindingNavIndex(0);
      setViewerMode("source");
      setMobilePane("results");
      const firstLine = findingsWithLines(collectAllFindings(entry.result))[0]?.line;
      if (firstLine) setHighlightLine(firstLine);
      pushToast("info", `Restored run · ${entry.target}`);
    },
    [pushToast]
  );

  useEffect(() => {
    if (!loading) return;
    const start = Date.now();
    const id = setInterval(() => setElapsedMs(Date.now() - start), 100);
    return () => clearInterval(id);
  }, [loading]);

  const handleFiles = useCallback(
    async (list: FileList | File[]) => {
      const res = await ingestFiles(list);
      setFiles(res.files);
      selectPath(res.files[0]?.path ?? null);
      setResult(null);
      setError(null);
      setParseError(false);
      setRawText(null);
      setDurationMs(null);
      setWorkspaceSource("local upload");
      setMobilePane("code");

      const notes: string[] = [];
      if (res.skipped.length) {
        notes.push(
          `Skipped ${res.skipped.length}: ${res.skipped.slice(0, 5).join("; ")}${res.skipped.length > 5 ? "…" : ""}`
        );
      }
      if (res.truncated.length) {
        notes.push(`Truncated: ${res.truncated.join(", ")}`);
      }
      notes.push(...res.warnings);
      if (res.files.length === 0 && list.length > 0) {
        notes.push("No text/source files were accepted from that upload.");
      }
      setIngestNotes(notes);
      if (res.files.length > 0) {
        pushToast(
          "success",
          `Loaded ${res.files.length} file${res.files.length === 1 ? "" : "s"}`
        );
      }
    },
    [pushToast, selectPath]
  );

  const addPastedFile = useCallback(
    (opts: { filename: string; content: string; language: string }) => {
      const path = opts.filename.startsWith("pasted/")
        ? opts.filename
        : `pasted/${opts.filename}`;
      const file: CodeFile = {
        id: `paste-${Date.now()}`,
        name: opts.filename.split("/").pop() || opts.filename,
        path,
        content: opts.content,
        language: opts.language || detectLanguage(opts.filename),
        size: new TextEncoder().encode(opts.content).length,
      };
      setFiles((prev) => {
        const without = prev.filter((f) => f.path !== path);
        return [...without, file].sort((a, b) => a.path.localeCompare(b.path));
      });
      selectPath(path);
      setResult(null);
      setError(null);
      setIngestNotes([`Pasted ${path}`]);
      setWorkspaceSource("paste");
      setMobilePane("code");
      pushToast("success", `Added ${file.name}`);
    },
    [pushToast, selectPath]
  );

  const loadGitHubRepo = useCallback(
    (res: GitHubLoadResult) => {
      setFiles(res.files);
      selectPath(res.files[0]?.path ?? null);
      setResult(null);
      setError(null);
      setParseError(false);
      setRawText(null);
      setDurationMs(null);
      setViewerMode("source");
      setHighlightLine(null);
      setMobilePane("code");

      const label = `${res.repo.owner}/${res.repo.name}@${res.repo.ref}`;
      setWorkspaceSource(`github:${label}`);
      const notes: string[] = [
        `Loaded ${res.files.length} file${res.files.length === 1 ? "" : "s"} from ${label}`,
      ];
      if (res.repo.private) notes.push("Private repository (token auth)");
      if (res.skipped.length) {
        notes.push(
          `Skipped ${res.skipped.length}: ${res.skipped.slice(0, 4).join("; ")}${res.skipped.length > 4 ? "…" : ""}`
        );
      }
      if (res.truncated.length) {
        notes.push(`Truncated: ${res.truncated.join(", ")}`);
      }
      notes.push(...res.warnings);
      setIngestNotes(notes);
      pushToast(
        "success",
        `GitHub · ${res.files.length} file${res.files.length === 1 ? "" : "s"} from ${res.repo.name}`
      );
    },
    [pushToast, selectPath]
  );

  const loadSample = useCallback(
    (sample: CodeFile, autoAnalyze = false) => {
      const meta = SAMPLE_META[sample.id];
      if (meta?.recommendedTasks) {
        setEnabledTasks(new Set(meta.recommendedTasks as TaskId[]));
      }
      setFiles([{ ...sample }]);
      selectPath(sample.path);
      setResult(null);
      setError(null);
      setParseError(false);
      setRawText(null);
      setDurationMs(null);
      setIngestNotes([
        `Loaded sample: ${sample.name}${meta ? ` · ${meta.tag}` : ""}`,
      ]);
      setWorkspaceSource(`sample:${sample.name}`);
      setMobilePane("code");
      pushToast("info", `Sample loaded: ${sample.name}`);

      if (autoAnalyze) {
        setTimeout(() => loadAndAnalyzeRef.current(sample), 50);
      }
    },
    [pushToast, selectPath]
  );

  const loadAllSamples = useCallback(() => {
    const all = SAMPLE_SNIPPETS.map((s) => ({ ...s }));
    setFiles(all);
    selectPath(all[0]?.path ?? null);
    setResult(null);
    setError(null);
    setParseError(false);
    setRawText(null);
    setDurationMs(null);
    setWorkspaceSource("samples");
    setIngestNotes([`Loaded ${all.length} sample snippets`]);
    pushToast("info", "All samples loaded");
  }, [pushToast, selectPath]);

  const clearFiles = useCallback(() => {
    setFiles([]);
    selectPath(null);
    setResult(null);
    setError(null);
    setParseError(false);
    setRawText(null);
    setDurationMs(null);
    setIngestNotes([]);
    setLastTarget(null);
    setWorkspaceSource(null);
    setHighlightLine(null);
    setFindingNavIndex(0);
    clearWorkspace();
  }, [selectPath]);

  const cancelAnalyze = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    pushToast("info", "Analysis cancelled");
  }, [pushToast]);

  const analyzeWith = useCallback(
    async (
      fileList: CodeFile[],
      path: string | null,
      tasks: Set<TaskId>,
      analysisDepth: AnalysisDepth = depth
    ) => {
      if (fileList.length === 0) {
        setError("Load a file, folder, or sample first.");
        return;
      }
      if (tasks.size === 0) {
        setError("Enable at least one analysis task.");
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setElapsedMs(0);
      setError(null);
      setParseError(false);
      setRawText(null);
      setResult(null);
      setViewerMode("source");
      setFindOpen(false);
      setHighlightLine(null);
      setFindingNavIndex(0);
      const target = path ?? "entire codebase";
      setLastTarget(target);
      setMobilePane("results");
      const started = Date.now();
      const note = focusNote.trim() || undefined;

      try {
        const payload = {
          files: fileList.map((f) => ({
            name: f.name,
            path: f.path,
            content: f.content,
            language: f.language,
          })),
          selectedPath: path,
          tasks: Array.from(tasks),
          depth: analysisDepth,
          focusNote: note,
        };

        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        let data: AnalyzeResponse;
        try {
          data = (await res.json()) as AnalyzeResponse;
        } catch {
          if (controller.signal.aborted) return;
          setError(`Server returned non-JSON (HTTP ${res.status}).`);
          setLoading(false);
          return;
        }

        if (controller.signal.aborted) return;

        const took = Date.now() - started;
        setDurationMs(took);

        if (!data.ok) {
          setError(data.error || `Request failed (HTTP ${res.status}).`);
          setParseError(Boolean(data.parseError));
          setRawText(data.rawText ?? null);
          setLoading(false);
          pushToast("error", "Analysis failed");
          return;
        }

        setResult(data.result);
        setRawText(data.rawText ?? null);
        setLockBurstAt(Date.now());
        setFocusNoteOpen(false);
        const entry = buildHistoryEntry({
          target,
          tasks: Array.from(tasks),
          durationMs: took,
          depth: analysisDepth,
          focusNote: note,
          result: data.result,
        });
        setHistory((h) => prependHistory(h, entry));
        const findingCount = entry.findingCount;
        const first = findingsWithLines(collectAllFindings(data.result))[0];
        if (first?.line) {
          setHighlightLine(first.line);
          setFindingNavIndex(0);
        }
        pushToast(
          "success",
          findingCount
            ? `Focus locked · ${findingCount} finding${findingCount === 1 ? "" : "s"} · ${(took / 1000).toFixed(1)}s`
            : `Focus locked · ${(took / 1000).toFixed(1)}s`
        );
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          return;
        }
        setError(
          e instanceof Error ? e.message : "Network error calling /api/analyze."
        );
        pushToast("error", "Network error");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    [pushToast, depth, focusNote]
  );

  const analyze = useCallback(() => {
    void analyzeWith(files, selectedPath, enabledTasks, depth);
  }, [analyzeWith, files, selectedPath, enabledTasks, depth]);

  useEffect(() => {
    analyzeRef.current = analyze;
    loadAndAnalyzeRef.current = (sample: CodeFile) => {
      const meta = SAMPLE_META[sample.id];
      const tasks = new Set(
        (meta?.recommendedTasks as TaskId[] | undefined) ?? DEFAULT_TASKS
      );
      void analyzeWith([sample], sample.path, tasks);
    };
  }, [analyze, analyzeWith]);

  const applyFix = useCallback(
    (code: string) => {
      if (!selectedPath) {
        pushToast("error", "Select a file to apply the fix");
        return;
      }
      setFiles((prev) =>
        prev.map((f) =>
          f.path === selectedPath
            ? {
                ...f,
                content: code,
                size: new TextEncoder().encode(code).length,
              }
            : f
        )
      );
      setViewerMode("source");
      setMobilePane("code");
      pushToast("success", "Applied fixed code to " + selectedPath);
    },
    [selectedPath, pushToast]
  );

  const addTestsAsFile = useCallback(
    (code: string, framework: string) => {
      const base = selectedFile?.name?.replace(/\.[^.]+$/, "") || "generated";
      const lang = selectedFile?.language || "javascript";
      let name: string;
      let language: string;
      if (lang === "python") {
        name = `test_${base}.py`;
        language = "python";
      } else if (lang === "typescript" || lang === "tsx") {
        name = `${base}.test.ts`;
        language = "typescript";
      } else {
        name = `${base}.test.js`;
        language = "javascript";
      }
      const path = `tests/${name}`;
      const file: CodeFile = {
        id: `tests-${Date.now()}`,
        name,
        path,
        content: code,
        language,
        size: new TextEncoder().encode(code).length,
      };
      setFiles((prev) => {
        const without = prev.filter((f) => f.path !== path);
        return [...without, file].sort((a, b) => a.path.localeCompare(b.path));
      });
      selectPath(path);
      setMobilePane("code");
      pushToast("success", `Added ${path} (${framework})`);
    },
    [selectedFile, pushToast, selectPath]
  );

  const exportMarkdown = useCallback(() => {
    if (!result) return;
    const md = resultToMarkdown(result, {
      target: lastTarget ?? (viewerName || "code"),
      language: viewerLang,
      tasks: Array.from(enabledTasks),
      durationMs: durationMs ?? undefined,
      depth,
    });
    const safe = (lastTarget ?? "analysis").replace(/[^\w.-]+/g, "_");
    downloadText(`code-lens-${safe}.md`, md, "text/markdown");
    pushToast("success", "Exported Markdown");
  }, [result, lastTarget, viewerName, viewerLang, enabledTasks, durationMs, depth, pushToast]);

  const exportJson = useCallback(() => {
    if (!result) return;
    const safe = (lastTarget ?? "analysis").replace(/[^\w.-]+/g, "_");
    downloadText(
      `code-lens-${safe}.json`,
      JSON.stringify(
        {
          target: lastTarget,
          language: viewerLang,
          tasks: Array.from(enabledTasks),
          depth,
          focusNote: focusNote.trim() || undefined,
          durationMs,
          result,
        },
        null,
        2
      ),
      "application/json"
    );
    pushToast("success", "Exported JSON");
  }, [result, lastTarget, viewerLang, enabledTasks, depth, focusNote, durationMs, pushToast]);

  const exportSarif = useCallback(() => {
    if (!result) return;
    const safe = (lastTarget ?? "analysis").replace(/[^\w.-]+/g, "_");
    const sarif = resultToSarif(result, {
      target: lastTarget ?? viewerName ?? "code",
      language: viewerLang,
    });
    downloadText(
      `code-lens-${safe}.sarif.json`,
      JSON.stringify(sarif, null, 2),
      "application/sarif+json"
    );
    pushToast("success", "Exported SARIF");
  }, [result, lastTarget, viewerName, viewerLang, pushToast]);

  const copyShareSummary = useCallback(async () => {
    if (!result) {
      pushToast("error", "No analysis to share");
      return;
    }
    const findings = collectAllFindings(result);
    const tips = result.improvements?.length ?? 0;
    const text = [
      `Code Lens · ${lastTarget ?? viewerName}`,
      `Model: grok-4.5 · depth ${depth} · ${durationMs != null ? (durationMs / 1000).toFixed(1) + "s" : "n/a"}`,
      result.explanation ? `Explain: ${result.explanation.slice(0, 200)}…` : null,
      findings.length ? `Findings: ${findings.length}` : null,
      result.security ? `Security risk: ${result.security.risk_level}` : null,
      result.tests ? `Tests: ${result.tests.framework}` : null,
      tips ? `Improvements: ${tips}` : null,
      result.architecture
        ? `Arch: coupling ${result.architecture.coupling} / cohesion ${result.architecture.cohesion}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");
    await navigator.clipboard.writeText(text);
    pushToast("success", "Summary copied to clipboard");
  }, [result, lastTarget, viewerName, durationMs, depth, pushToast]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const tag = (e.target as HTMLElement)?.tagName;
      const inInput =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement)?.isContentEditable;

      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen(true);
        return;
      }
      // Block global shortcuts while any modal/palette is open (paste, cmd, github, help)
      const modalOpen = pasteOpen || cmdOpen || githubOpen || helpOpen;

      if (meta && e.key === "Enter" && !modalOpen) {
        e.preventDefault();
        if (!loading) analyzeRef.current();
        return;
      }
      if (meta && e.key.toLowerCase() === "f" && !inInput && !modalOpen) {
        e.preventDefault();
        setFindOpen((v) => !v);
        setMobilePane("code");
        return;
      }
      if (meta && e.shiftKey && (e.key === "p" || e.key === "P") && !modalOpen) {
        e.preventDefault();
        setPasteOpen(true);
        return;
      }
      if (meta && e.shiftKey && (e.key === "g" || e.key === "G") && !modalOpen) {
        e.preventDefault();
        setGithubOpen(true);
        return;
      }
      if (meta && e.shiftKey && (e.key === "?" || e.key === "/")) {
        e.preventDefault();
        setHelpOpen((v) => !v);
        return;
      }
      if (e.key === "Escape") {
        setPasteOpen(false);
        setGithubOpen(false);
        setHelpOpen(false);
        setCmdOpen(false);
        setFindOpen(false);
        return;
      }
      // Number keys: samples when empty; [ ] file nav; 1-3 panes when loaded
      if (!inInput && !meta && !e.altKey && !modalOpen) {
        if (files.length === 0) {
          const sampleIdx = parseInt(e.key, 10) - 1;
          if (sampleIdx >= 0 && sampleIdx < SAMPLE_SNIPPETS.length && e.key.length === 1) {
            e.preventDefault();
            loadSample(SAMPLE_SNIPPETS[sampleIdx], true);
          }
        } else {
          if (e.key === "1") setMobilePane("files");
          if (e.key === "2") setMobilePane("code");
          if (e.key === "3") setMobilePane("results");
          if (e.key === "[" || e.key === "]") {
            const idx = files.findIndex((f) => f.path === selectedPath);
            if (e.key === "[" && idx > 0) {
              e.preventDefault();
              selectPath(files[idx - 1].path);
            }
            if (e.key === "]" && idx >= 0 && idx < files.length - 1) {
              e.preventDefault();
              selectPath(files[idx + 1].path);
            }
          }
          // Next / previous finding with line target
          if ((e.key === "n" || e.key === "N" || e.key === "p" || e.key === "P") && lineFindings.length > 0) {
            e.preventDefault();
            const delta = e.key === "n" || e.key === "N" ? 1 : -1;
            const next =
              (findingNavIndex + delta + lineFindings.length) % lineFindings.length;
            const f = lineFindings[next];
            if (f?.line != null) jumpToFinding(next, f.line);
          }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    loading,
    pasteOpen,
    cmdOpen,
    githubOpen,
    helpOpen,
    files,
    selectedPath,
    loadSample,
    selectPath,
    lineFindings,
    findingNavIndex,
    jumpToFinding,
  ]);

  const canAnalyze = files.length > 0 && enabledTasks.size > 0 && !loading;

  const commands: CommandItem[] = useMemo(
    () => [
      {
        id: "analyze",
        label: "Analyze current selection",
        hint: "⌘↵",
        group: "Analysis",
        run: () => analyzeRef.current(),
      },
      {
        id: "depth",
        label: depth === "deep" ? "Switch to standard depth" : "Switch to deep depth",
        group: "Analysis",
        run: () => setDepth((d) => (d === "deep" ? "standard" : "deep")),
      },
      {
        id: "cancel",
        label: "Cancel analysis",
        group: "Analysis",
        run: () => cancelAnalyze(),
      },
      {
        id: "paste",
        label: "Paste code…",
        hint: "⌘⇧P",
        group: "Workspace",
        run: () => setPasteOpen(true),
      },
      {
        id: "github",
        label: "Load GitHub repository…",
        hint: "⌘⇧G",
        group: "Workspace",
        run: () => setGithubOpen(true),
      },
      {
        id: "find",
        label: "Find in file",
        hint: "⌘F",
        group: "Workspace",
        run: () => {
          setFindOpen(true);
          setMobilePane("code");
        },
      },
      {
        id: "focus",
        label: focusMode ? "Exit focus mode" : "Focus mode (hide files)",
        group: "Workspace",
        run: () => setFocusMode((f) => !f),
      },
      {
        id: "clear",
        label: "Clear workspace",
        group: "Workspace",
        run: () => clearFiles(),
      },
      ...SAMPLE_SNIPPETS.map((s) => ({
        id: `sample-${s.id}`,
        label: `Load sample: ${s.name}`,
        group: "Samples",
        run: () => loadSample(s, false),
      })),
      {
        id: "sample-all",
        label: "Load all samples",
        group: "Samples",
        run: () => loadAllSamples(),
      },
      {
        id: "sample-analyze-js",
        label: "Load & analyze JS bug sample",
        group: "Samples",
        run: () => loadSample(SAMPLE_SNIPPETS[0], true),
      },
      {
        id: "export-md",
        label: "Export results as Markdown",
        group: "Export",
        run: () => exportMarkdown(),
      },
      {
        id: "export-json",
        label: "Export results as JSON",
        group: "Export",
        run: () => exportJson(),
      },
      {
        id: "export-sarif",
        label: "Export findings as SARIF",
        group: "Export",
        run: () => exportSarif(),
      },
      {
        id: "focus-note",
        label: focusNoteOpen ? "Hide focus note" : "Edit analysis focus note…",
        group: "Analysis",
        run: () => setFocusNoteOpen((v) => !v),
      },
      {
        id: "share",
        label: "Copy share summary",
        group: "Export",
        run: () => void copyShareSummary(),
      },
      {
        id: "help",
        label: "Keyboard shortcuts",
        hint: "⌘⇧?",
        group: "Help",
        run: () => setHelpOpen(true),
      },
    ],
    [
      cancelAnalyze,
      clearFiles,
      loadSample,
      loadAllSamples,
      exportMarkdown,
      exportJson,
      exportSarif,
      copyShareSummary,
      focusMode,
      depth,
      focusNoteOpen,
    ]
  );

  const paneClass = (pane: MobilePane) =>
    mobilePane === pane ? "flex" : "hidden lg:flex";

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <GrainOverlay />
      <LensBackdrop active={files.length === 0 || loading} />
      {loading && (
        <div className="analyze-meter absolute left-0 right-0 top-0 z-30">
          <span />
        </div>
      )}

      <header className="app-header shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <ApertureLogo spinning={loading} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <h1 className="font-mono text-[13px] font-semibold tracking-wide text-[var(--fg)]">
                  code-lens
                </h1>
                {hasApiKey === false && (
                  <span className="font-mono text-[10px] text-[var(--danger)]">
                    no key
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              className="btn-secondary"
              title="⌘K"
            >
              cmd
            </button>
            <div className="relative" ref={samplesMenuRef}>
              <button
                type="button"
                onClick={() => setSamplesMenuOpen((v) => !v)}
                className="btn-secondary"
                title="Load demo samples"
              >
                samples ▾
              </button>
              {samplesMenuOpen && (
                <div className="absolute right-0 top-full z-40 mt-1 min-w-[11rem] border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg">
                  {SAMPLE_SNIPPETS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        loadSample(s, false);
                        setSamplesMenuOpen(false);
                      }}
                      className="flex w-full flex-col px-3 py-1.5 text-left hover:bg-[var(--surface-2)]"
                    >
                      <span className="font-mono text-[11px] text-[var(--fg)]">
                        {s.name}
                      </span>
                      <span className="font-mono text-[10px] text-[var(--muted-2)]">
                        {SAMPLE_META[s.id]?.tag ?? s.language}
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      loadAllSamples();
                      setSamplesMenuOpen(false);
                    }}
                    className="w-full border-t border-[var(--border)] px-3 py-1.5 text-left font-mono text-[11px] text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--accent)]"
                  >
                    Load all
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="btn-ghost"
              title="Shortcuts"
            >
              ?
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-4 py-2.5">
          <TaskToggles
            enabled={enabledTasks}
            onChange={setEnabledTasks}
            depth={depth}
            onDepthChange={setDepth}
            disabled={loading}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFocusNoteOpen((v) => !v)}
              className={`btn-ghost text-xs ${
                focusNote.trim() || focusNoteOpen ? "text-[var(--accent)]" : ""
              }`}
              title="Optional focus note"
              disabled={loading}
            >
              note{focusNote.trim() ? " ·" : ""}
            </button>
            {files.length > 0 && (
              <button
                type="button"
                onClick={clearFiles}
                className="btn-ghost text-xs"
                disabled={loading}
              >
                Clear
              </button>
            )}
            {loading ? (
              <button type="button" onClick={cancelAnalyze} className="btn-secondary text-xs">
                Cancel
              </button>
            ) : null}
            <button
              type="button"
              onClick={analyze}
              disabled={!canAnalyze}
              className={`btn-primary btn-primary-magnetic ${loading ? "btn-primary-live" : ""}`}
              title="⌘/Ctrl + Enter"
            >
              {loading ? (
                <>
                  <span className="spinner spinner-sm" />
                  focusing…
                </>
              ) : (
                <>
                  analyze
                  <kbd className="ml-1 hidden opacity-70 sm:inline">⌘↵</kbd>
                </>
              )}
            </button>
          </div>
        </div>

        {focusNoteOpen && (
          <div className="border-t border-[var(--border)] bg-[var(--surface-2)]/60 px-4 py-2">
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-[var(--muted-2)]">
              focus note · steers analysis without changing lenses
            </label>
            <textarea
              value={focusNote}
              onChange={(e) => setFocusNote(e.target.value.slice(0, 2000))}
              disabled={loading}
              rows={2}
              spellCheck={false}
              placeholder='e.g. "Focus on auth boundaries and injection surfaces in this module"'
              className="w-full resize-y border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1.5 font-mono text-[11px] leading-relaxed text-[var(--fg-dim)] outline-none focus:border-[var(--accent-border)]"
            />
            <div className="mt-1 flex items-center justify-between">
              <span className="font-mono text-[10px] text-[var(--muted-2)]">
                {focusNote.length}/2000
              </span>
              {focusNote.trim() && (
                <button
                  type="button"
                  className="btn-ghost !px-1.5 !py-0.5 text-[10px]"
                  onClick={() => setFocusNote("")}
                  disabled={loading}
                >
                  clear note
                </button>
              )}
            </div>
          </div>
        )}

        {ingestNotes.length > 0 && (
          <div className="flex items-center gap-2 border-t border-[var(--border)] px-4 py-1">
            <p className="min-w-0 flex-1 truncate font-mono text-[10px] text-[var(--muted)]" title={ingestNotes.join(" · ")}>
              {ingestNotes[0]}
              {ingestNotes.length > 1 ? ` · +${ingestNotes.length - 1}` : ""}
            </p>
            <button
              type="button"
              className="btn-ghost !px-1.5 !py-0.5 text-[10px]"
              onClick={() => setIngestNotes([])}
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex border-t border-[var(--border)] lg:hidden">
          {(
            [
              ["files", "Files"],
              ["code", "Code"],
              ["results", "Results"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMobilePane(id)}
              className={`flex-1 py-2 text-center text-xs font-medium transition ${
                mobilePane === id
                  ? "border-b-2 border-[var(--accent)] text-[var(--accent)]"
                  : "text-[var(--muted)]"
              }`}
            >
              {label}
              {id === "results" && result && !loading && (
                <span className="ml-1 inline-block h-1.5 w-1.5 bg-[var(--ok)]" />
              )}
              {id === "results" && loading && (
                <span className="ml-1 inline-block h-1.5 w-1.5 animate-pulse bg-[var(--accent)]" />
              )}
            </button>
          ))}
        </div>
      </header>

      {/* HUD only for multi-file / workspace focus — single file path is in the code header */}
      {files.length > 1 && (
        <FocusHUD
          target={selectedPath ?? "entire workspace"}
          language={viewerLang}
          loading={loading}
          hasResult={Boolean(result)}
          lineCount={lineCount}
        />
      )}

      <div
        className={`relative grid min-h-0 flex-1 grid-cols-1 ${
          focusMode
            ? "lg:grid-cols-[1fr_minmax(340px,420px)]"
            : "lg:grid-cols-[260px_1fr_minmax(340px,420px)]"
        }`}
      >
        <LockBurst trigger={lockBurstAt} />
        {!focusMode && (
          <aside
            className={`${paneClass("files")} pane-split min-h-[200px] flex-col border-b border-[var(--border)] bg-[var(--surface)] lg:min-h-0 lg:border-b-0 lg:border-r`}
          >
            <div className="min-h-0 flex-1 overflow-hidden">
              <FileTree
                files={files}
                selectedPath={selectedPath}
                onSelect={(p) => {
                  selectPath(p);
                  setMobilePane("code");
                }}
              />
            </div>
            {history.length > 0 && (
              <div className="shrink-0 border-t border-[var(--border)] px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => setHistoryOpen((v) => !v)}
                  className="pane-title mb-1 flex w-full items-center justify-between px-1 text-left hover:text-[var(--muted)]"
                >
                  <span>recent</span>
                  <span className="font-mono text-[10px] text-[var(--muted-2)]">
                    {historyOpen ? "▾" : `▸ ${history.length}`}
                  </span>
                </button>
                {historyOpen && (
                  <ul className="max-h-28 space-y-0.5 overflow-y-auto">
                    {history.slice(0, 5).map((h) => (
                      <li key={h.id}>
                        <button
                          type="button"
                          onClick={() => restoreHistory(h)}
                          className="flex w-full items-center gap-2 rounded-[var(--radius)] px-1.5 py-1 text-left font-mono text-[10px] text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg-dim)]"
                          title={`${h.tasks.join(", ")} · ${h.findingCount} findings · ${(h.durationMs / 1000).toFixed(1)}s`}
                        >
                          <span className="tabular-nums text-[var(--muted-2)]">
                            {(h.durationMs / 1000).toFixed(1)}s
                          </span>
                          <span className="min-w-0 flex-1 truncate">{h.target}</span>
                          {h.findingCount > 0 && (
                            <span className="text-[var(--muted-2)]">{h.findingCount}</span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {files.length > 0 && (
              <div className="shrink-0 border-t border-[var(--border)] p-2">
                <div className="relative" ref={addMenuRef}>
                  <button
                    type="button"
                    onClick={() => setAddMenuOpen((v) => !v)}
                    className="btn-secondary w-full justify-center text-xs"
                    disabled={loading}
                  >
                    + Add ▾
                  </button>
                  {addMenuOpen && (
                    <div className="absolute bottom-full left-0 right-0 z-40 mb-1 border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg">
                      <button
                        type="button"
                        className="block w-full px-3 py-1.5 text-left font-mono text-[11px] text-[var(--fg-dim)] hover:bg-[var(--surface-2)] hover:text-[var(--accent)]"
                        onClick={() => {
                          setPasteOpen(true);
                          setAddMenuOpen(false);
                        }}
                      >
                        Paste code
                      </button>
                      <button
                        type="button"
                        className="block w-full px-3 py-1.5 text-left font-mono text-[11px] text-[var(--fg-dim)] hover:bg-[var(--surface-2)] hover:text-[var(--accent)]"
                        onClick={() => {
                          setGithubOpen(true);
                          setAddMenuOpen(false);
                        }}
                      >
                        GitHub repo
                      </button>
                      <div className="border-t border-[var(--border)] px-2 py-2">
                        <DropZone onFiles={(f) => { setAddMenuOpen(false); void handleFiles(f); }} disabled={loading} compact />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>
        )}

        <main
          className={`${paneClass("code")} relative min-h-[280px] flex-col border-b border-[var(--border)] bg-[var(--code-bg)] lg:min-h-0 lg:border-b-0 lg:border-r`}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-1.5">
            <div className="flex min-w-0 items-center gap-2">
              {files.length > 1 && selectedFile && (
                <FileNav
                  files={files}
                  selectedPath={selectedPath}
                  onSelect={selectPath}
                />
              )}
              <span className="min-w-0 truncate font-mono text-[11px] text-[var(--fg-dim)]">
                {viewerName || "No file selected"}
                {showingFixed && (
                  <span className="ml-2 text-[var(--ok)]">· fixed</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {fixedCode && selectedFile && (
                <div className="flex overflow-hidden rounded-[var(--radius)] border border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setViewerMode("source")}
                    className={`px-1.5 py-0.5 font-mono text-[10px] uppercase ${
                      viewerMode === "source"
                        ? "bg-[var(--accent-dim)] text-[var(--accent)]"
                        : "text-[var(--muted)]"
                    }`}
                  >
                    src
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewerMode("fixed")}
                    className={`border-l border-[var(--border)] px-1.5 py-0.5 font-mono text-[10px] uppercase ${
                      viewerMode === "fixed"
                        ? "bg-[var(--ok-dim)] text-[var(--ok)]"
                        : "text-[var(--muted)]"
                    }`}
                  >
                    fix
                  </button>
                </div>
              )}
              {markedLines > 0 && !showingFixed && (
                <span className="font-mono text-[10px] text-[var(--danger)]">
                  {markedLines}·
                </span>
              )}
            </div>
          </div>
          {selectedFile && lineFindings.length > 0 && !showingFixed && (
            <FindingsNav
              findings={lineFindings}
              activeIndex={findingNavIndex}
              onJump={jumpToFinding}
            />
          )}
          <div className="relative min-h-0 flex-1 p-2">
            <CodeSearch
              code={viewerCode}
              open={findOpen && Boolean(selectedFile)}
              onClose={() => setFindOpen(false)}
            />
            {files.length === 0 ? (
              <div className="empty-workspace relative z-[1] flex h-full flex-col items-center justify-center gap-5 overflow-y-auto p-4 sm:p-6">
                <div className="animate-fade-up text-center">
                  <div className="hero-lens">
                    <div className="hero-lens-ring" />
                    <div className="hero-lens-ring hero-lens-ring-2" />
                    <div className="hero-lens-core">CL</div>
                  </div>
                  <h2 className="font-mono text-[15px] font-semibold tracking-wide text-[var(--fg)]">
                    <Typewriter text="Point the lens at your code" speed={32} />
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-[12px] leading-relaxed text-[var(--muted)]">
                    Six lenses · severity findings · line annotations · deep mode.
                    Live grok-4.5 — nothing canned.
                  </p>
                </div>

                <SampleCards onLoad={loadSample} disabled={loading} />

                <div className="animate-fade-up stagger-4 flex w-full max-w-[40rem] flex-col gap-2 sm:flex-row sm:items-stretch">
                  <div className="min-w-0 flex-1">
                    <DropZone onFiles={handleFiles} disabled={loading} />
                  </div>
                  <div className="flex shrink-0 gap-2 sm:w-36 sm:flex-col">
                    <button
                      type="button"
                      onClick={() => setPasteOpen(true)}
                      className="btn-secondary flex-1 justify-center"
                    >
                      paste
                    </button>
                    <button
                      type="button"
                      onClick={() => setGithubOpen(true)}
                      className="btn-secondary flex-1 justify-center"
                      title="⌘⇧G"
                    >
                      github
                    </button>
                  </div>
                </div>

                <div className="shortcut-dock">
                  <button type="button" className="tip-chip" onClick={() => setCmdOpen(true)}>
                    <span className="text-[var(--accent)]">⌘K</span> cmd
                  </button>
                  <button
                    type="button"
                    className="tip-chip"
                    onClick={() => loadSample(SAMPLE_SNIPPETS[0], true)}
                  >
                    demo
                  </button>
                  <span className="tip-chip">
                    <span className="text-[var(--accent)]">⌘↵</span> run
                  </span>
                </div>
              </div>
            ) : selectedFile ? (
              <div className="view-enter relative h-full">
                <ScanOverlay active={loading} />
                <CodeBlock
                  code={viewerCode}
                  language={viewerLang}
                  filename={showingFixed ? `${viewerName} (fixed)` : viewerName}
                  maxHeight="100%"
                  fontSize={fontSize}
                  onFontSizeChange={setFontSize}
                  showFind={findOpen}
                  onToggleFind={() => setFindOpen((v) => !v)}
                  annotations={showingFixed ? [] : annotations}
                  highlightLine={showingFixed ? null : highlightLine}
                  onAnnotationClick={jumpToLine}
                />
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 overflow-y-auto px-6 py-8 text-center">
                <div className="hero-lens !mb-2 !h-20 !w-20">
                  <div className="hero-lens-ring" />
                  <div className="hero-lens-ring hero-lens-ring-2" />
                  <div className="hero-lens-core !inset-5 !text-[10px]">∗</div>
                </div>
                <p className="font-mono text-[12px] text-[var(--fg)]">
                  wide-field mode · {files.length} files
                </p>
                <p className="max-w-sm text-[11px] text-[var(--muted)]">
                  Analyze sends the full workspace to grok-4.5. Click a tile to
                  narrow focus.
                </p>
                <div className="workspace-mosaic mt-2">
                  {files.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => selectPath(f.path)}
                      className="workspace-tile"
                    >
                      <span className="block font-mono text-[10px] uppercase text-[var(--accent)]">
                        {f.language.slice(0, 3)}
                      </span>
                      <span className="mt-1 block truncate font-mono text-[11px] text-[var(--fg)]">
                        {f.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-[var(--muted-2)]">
                        {f.path}
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={analyze}
                  disabled={!canAnalyze}
                  className="btn-primary mt-2"
                >
                  focus analyze all
                </button>
              </div>
            )}
          </div>
        </main>

        <aside
          className={`${paneClass("results")} min-h-[320px] flex-col border-l border-[var(--border)] bg-[var(--bg)] lg:min-h-0 ${
            result && !loading ? "results-flash" : ""
          }`}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-3 py-2">
            <span className="pane-title">analysis</span>
            <div className="flex min-w-0 items-center gap-2">
              {result && !loading && (
                <button
                  type="button"
                  onClick={() => void copyShareSummary()}
                  className="btn-ghost !px-1.5 !py-0.5"
                >
                  share
                </button>
              )}
              {loading && (
                <span className="font-mono text-[10px] text-[var(--accent)]">
                  focusing…
                </span>
              )}
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <ResultsPanel
              loading={loading}
              error={error}
              parseError={parseError}
              rawText={rawText}
              result={result}
              enabledTasks={Array.from(enabledTasks)}
              language={
                viewerLang !== "text"
                  ? viewerLang
                  : selectedFile?.language ?? "javascript"
              }
              originalCode={selectedFile?.content ?? ""}
              sourceStats={sourceStats}
              durationMs={durationMs}
              elapsedMs={elapsedMs}
              hasFiles={files.length > 0}
              depth={depth}
              onApplyFix={applyFix}
              onAddTests={addTestsAsFile}
              onExportMarkdown={result ? exportMarkdown : undefined}
              onExportJson={result ? exportJson : undefined}
              onRetry={
                canAnalyze || (files.length > 0 && enabledTasks.size > 0)
                  ? analyze
                  : undefined
              }
              onCancel={loading ? cancelAnalyze : undefined}
              onAnalyze={canAnalyze ? analyze : undefined}
              onJumpToLine={(line) => {
                const idx = lineFindings.findIndex((f) => f.line === line);
                jumpToFinding(idx >= 0 ? idx : 0, line);
              }}
              onExportSarif={result ? exportSarif : undefined}
            />
          </div>
        </aside>
      </div>

      <StatusBar
        fileCount={files.length}
        totalBytes={totalBytes}
        language={viewerLang}
        lineCount={lineCount}
        loading={loading}
        durationMs={durationMs}
        elapsedMs={elapsedMs}
        lastTarget={lastTarget}
        hasResult={Boolean(result)}
        hasApiKey={hasApiKey}
        sourceStats={sourceStats}
        workspaceSource={workspaceSource}
        findingCount={result ? collectAllFindings(result).length : 0}
        depth={depth}
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <PasteModal
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        onSubmit={addPastedFile}
      />
      <GitHubModal
        open={githubOpen}
        onClose={() => setGithubOpen(false)}
        onLoaded={loadGitHubRepo}
        disabled={loading}
      />
      <ShortcutsModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        commands={commands}
      />
    </div>
  );
}
