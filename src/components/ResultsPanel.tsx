"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CodeBlock } from "./CodeBlock";
import { DiffView } from "./DiffView";
import { Scorecard } from "./Scorecard";
import { FocusingPanel } from "./FocusingPanel";
import { ReadyPanel } from "./ReadyPanel";
import { FindingList } from "./FindingList";
import type { AnalysisResult, TaskId } from "@/lib/types";
import { ALL_TASKS } from "@/lib/types";
import type { CodeStats } from "@/lib/stats";
import { buildScorecard } from "@/lib/stats";
import { CountUp } from "./CountUp";
import { collectAllFindings, countBySeverity } from "@/lib/findings";
import type { ThemeId } from "@/lib/theme";

interface ResultsPanelProps {
  loading: boolean;
  error: string | null;
  parseError: boolean;
  rawText: string | null;
  result: AnalysisResult | null;
  enabledTasks: TaskId[];
  language: string;
  originalCode?: string;
  sourceStats?: CodeStats | null;
  durationMs?: number | null;
  elapsedMs?: number;
  hasFiles?: boolean;
  depth?: string;
  onApplyFix?: (code: string) => void;
  onAddTests?: (code: string, framework: string) => void;
  onExportMarkdown?: () => void;
  onExportJson?: () => void;
  onExportSarif?: () => void;
  onRetry?: () => void;
  onCancel?: () => void;
  onAnalyze?: () => void;
  onJumpToLine?: (line: number) => void;
  uiTheme?: ThemeId;
  /** Score change vs previous run (positive = improved). */
  scoreDelta?: number | null;
  /** Instant local static scan count for the selected file. */
  localFindingCount?: number;
}

export function ResultsPanel({
  loading,
  error,
  parseError,
  rawText,
  result,
  enabledTasks,
  language,
  originalCode = "",
  sourceStats = null,
  durationMs,
  elapsedMs = 0,
  hasFiles = false,
  depth,
  onApplyFix,
  onAddTests,
  onExportMarkdown,
  onExportJson,
  onExportSarif,
  onRetry,
  onCancel,
  onAnalyze,
  onJumpToLine,
  uiTheme = "dark",
  scoreDelta = null,
  localFindingCount = 0,
}: ResultsPanelProps) {
  const [activeTab, setActiveTab] = useState<"all" | TaskId>("all");
  const [stepIdx, setStepIdx] = useState(0);
  const [checklist, setChecklist] = useState({
    reviewed: false,
    fix: false,
    tests: false,
    export: false,
  });
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading) {
      setStepIdx(0);
      return;
    }
    const id = setInterval(() => {
      setStepIdx((i) => i + 1);
    }, 1600);
    return () => clearInterval(id);
  }, [loading]);

  // New result → scroll results to top + reset checklist
  useEffect(() => {
    if (!result) return;
    bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    setChecklist({ reviewed: false, fix: false, tests: false, export: false });
  }, [result]);

  useEffect(() => {
    if (!result) return;
    if (enabledTasks.length === 1) {
      setActiveTab(enabledTasks[0]);
      return;
    }
    // Prefer the tab with the most actionable findings first
    const bugN =
      result.bug_fixes?.structured_issues?.length ??
      result.bug_fixes?.issues?.length ??
      0;
    const secN = result.security?.findings?.length ?? 0;
    if (bugN > 0 && enabledTasks.includes("fix_bugs")) {
      setActiveTab("fix_bugs");
    } else if (secN > 0 && enabledTasks.includes("security_audit")) {
      setActiveTab("security_audit");
    } else {
      setActiveTab("all");
    }
  }, [result, enabledTasks]);

  const stats = useMemo(() => {
    if (!result) return null;
    const findings = collectAllFindings(result);
    return {
      issues:
        result.bug_fixes?.structured_issues?.length ??
        result.bug_fixes?.issues?.length ??
        0,
      improvements: result.improvements?.length ?? 0,
      hasFix: Boolean(result.bug_fixes?.fixed_code),
      hasTests: Boolean(result.tests?.code),
      security: result.security?.findings?.length ?? 0,
      hotspots: result.architecture?.hotspots?.length ?? 0,
      findings: findings.length,
      severityCounts: countBySeverity(findings),
    };
  }, [result]);

  const scorecard = useMemo(
    () => (result ? buildScorecard(sourceStats, result) : null),
    [result, sourceStats]
  );

  if (loading) {
    return (
      <FocusingPanel
        enabledTasks={enabledTasks}
        elapsedMs={elapsedMs}
        stepIdx={stepIdx}
        onCancel={onCancel}
      />
    );
  }

  if (error && parseError && rawText) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-auto p-4">
        <div className="rounded-[var(--radius)] border border-[var(--accent-border)] bg-[var(--accent-dim)] px-3 py-2">
          <p className="text-sm font-semibold text-[var(--accent)]">JSON parse error</p>
          <p className="mt-1 text-xs text-[var(--fg-dim)]">{error}</p>
          {onRetry && (
            <button type="button" onClick={onRetry} className="btn-secondary mt-2 text-[11px]">
              Retry analysis
            </button>
          )}
        </div>
        <RawOutputPanel rawText={rawText} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="empty-mark !border-[var(--danger)]/40 !bg-[var(--danger-dim)] !text-[var(--danger)]" aria-hidden>
          !
        </span>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--danger)]">
          error
        </p>
        <p className="text-[12px] font-medium text-[var(--fg)]">Analysis failed</p>
        <p className="max-w-sm text-xs leading-relaxed text-[var(--muted)] whitespace-pre-wrap">
          {error}
        </p>
        {error.includes("XAI_API_KEY") && (
          <div className="mt-1 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-left font-mono text-[11px] text-[var(--fg-dim)]">
            <div>Generate a key at https://console.x.ai</div>
            <div className="mt-1 text-[var(--accent)]">export XAI_API_KEY=&quot;xai-...&quot;</div>
            <div className="mt-1">Then restart: npm run dev</div>
          </div>
        )}
        {onRetry && (
          <button type="button" onClick={onRetry} className="btn-primary mt-1 text-xs">
            Retry
          </button>
        )}
      </div>
    );
  }

  if (!result) {
    return (
      <ReadyPanel
        enabledTasks={enabledTasks}
        hasFiles={hasFiles}
        onAnalyze={onAnalyze}
      />
    );
  }

  const tabs: Array<{ id: "all" | TaskId; label: string }> = [
    { id: "all", label: "All" },
    ...enabledTasks.map((id) => ({
      id,
      label: ALL_TASKS.find((t) => t.id === id)?.shortLabel ?? id,
    })),
  ];

  const visibleTasks =
    activeTab === "all" ? enabledTasks : enabledTasks.filter((t) => t === activeTab);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Calm summary strip */}
      <div className="shrink-0 border-b border-[var(--border)] px-2.5 py-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-[var(--muted)]">
          {stats && (
            <>
              <span className={stats.findings > 0 ? "text-[var(--danger)]" : "text-[var(--muted-2)]"}>
                <CountUp value={stats.findings} /> finding
                {stats.findings === 1 ? "" : "s"}
              </span>
              {durationMs != null && (
                <span className="tabular-nums text-[var(--muted-2)]">
                  {(durationMs / 1000).toFixed(1)}s
                </span>
              )}
              {depth === "deep" && (
                <span className="text-[var(--warn)]">deep</span>
              )}
            </>
          )}
          <div className="relative ml-auto">
            <ExportMenu
              onExportMarkdown={
                onExportMarkdown
                  ? () => {
                      setChecklist((c) => ({ ...c, export: true }));
                      onExportMarkdown();
                    }
                  : undefined
              }
              onExportJson={
                onExportJson
                  ? () => {
                      setChecklist((c) => ({ ...c, export: true }));
                      onExportJson();
                    }
                  : undefined
              }
              onExportSarif={
                onExportSarif
                  ? () => {
                      setChecklist((c) => ({ ...c, export: true }));
                      onExportSarif();
                    }
                  : undefined
              }
            />
          </div>
        </div>
      </div>

      {/* Tabs only when multiple lenses — avoid chrome for single-task runs */}
      {tabs.length > 2 && (
        <div className="results-tabs sticky top-0 z-[1] flex shrink-0 gap-0 overflow-x-auto border-b border-[var(--border)] bg-[var(--bg)]/90 px-1 backdrop-blur-md">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 border-b-2 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wide transition ${
                activeTab === tab.id
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--fg-dim)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div
        ref={bodyRef}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3"
        onScroll={() => {
          if (!checklist.reviewed) setChecklist((c) => ({ ...c, reviewed: true }));
        }}
      >
        {scorecard && activeTab === "all" && (
          <div className="animate-fade-up">
            <Scorecard
              score={scorecard.score}
              grade={scorecard.grade}
              notes={scorecard.notes}
              stats={sourceStats}
              dimensions={scorecard.dimensions}
              severityCounts={scorecard.severityCounts}
              calm
              scoreDelta={scoreDelta}
            />
          </div>
        )}
        {activeTab === "all" && localFindingCount > 0 && (
          <p className="font-mono text-[10px] text-[var(--muted-2)]">
            + {localFindingCount} local scan finding
            {localFindingCount === 1 ? "" : "s"} in source (see code pane strip)
          </p>
        )}
        {activeTab === "all" && (
          <NextSteps
            result={result}
            checklist={checklist}
            onMarkReviewed={() => setChecklist((c) => ({ ...c, reviewed: true }))}
            onApplyFix={
              onApplyFix && result.bug_fixes?.fixed_code
                ? () => {
                    onApplyFix(result.bug_fixes!.fixed_code);
                    setChecklist((c) => ({ ...c, fix: true }));
                  }
                : undefined
            }
            onAddTests={
              onAddTests && result.tests?.code
                ? () => {
                    onAddTests(result.tests!.code, result.tests!.framework);
                    setChecklist((c) => ({ ...c, tests: true }));
                  }
                : undefined
            }
            onExport={
              onExportMarkdown
                ? () => {
                    onExportMarkdown();
                    setChecklist((c) => ({ ...c, export: true }));
                  }
                : undefined
            }
          />
        )}
        {visibleTasks.map((taskId, i) => (
          <div key={taskId} className={`animate-fade-up stagger-${Math.min(i + 1, 4)}`}>
            <TaskResultCard
              taskId={taskId}
              result={result}
              language={language}
              originalCode={originalCode}
              onApplyFix={
                onApplyFix
                  ? (code) => {
                      onApplyFix(code);
                      setChecklist((c) => ({ ...c, fix: true }));
                    }
                  : undefined
              }
              onAddTests={
                onAddTests
                  ? (code, fw) => {
                      onAddTests(code, fw);
                      setChecklist((c) => ({ ...c, tests: true }));
                    }
                  : undefined
              }
              onJumpToLine={(line) => {
                setChecklist((c) => ({ ...c, reviewed: true }));
                onJumpToLine?.(line);
              }}
              uiTheme={uiTheme}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskResultCard({
  taskId,
  result,
  language,
  originalCode,
  onApplyFix,
  onAddTests,
  onJumpToLine,
  uiTheme = "dark",
}: {
  taskId: TaskId;
  result: AnalysisResult;
  language: string;
  originalCode: string;
  onApplyFix?: (code: string) => void;
  onAddTests?: (code: string, framework: string) => void;
  onJumpToLine?: (line: number) => void;
  uiTheme?: ThemeId;
}) {
  const [fixView, setFixView] = useState<"code" | "diff">("diff");
  const meta = ALL_TASKS.find((t) => t.id === taskId);
  const label = meta?.label ?? taskId;

  if (taskId === "explain") {
    if (result.explanation == null) return <MissingCard label={label} />;
    return (
      <PanelShell title={label} accent="info" copyText={result.explanation}>
        <ExpandableProse text={result.explanation} />
      </PanelShell>
    );
  }

  if (taskId === "fix_bugs") {
    if (result.bug_fixes == null) return <MissingCard label={label} />;
    const bf = result.bug_fixes;
    const showDiff = Boolean(bf.fixed_code && originalCode);
    const structured = bf.structured_issues;
    return (
      <PanelShell
        title={label}
        accent="danger"
        actions={
          <div className="flex items-center gap-1">
            {showDiff && (
              <div className="seg mr-1">
                <button
                  type="button"
                  onClick={() => setFixView("code")}
                  className={`seg-btn ${fixView === "code" ? "seg-btn-on" : ""}`}
                >
                  code
                </button>
                <button
                  type="button"
                  onClick={() => setFixView("diff")}
                  className={`seg-btn ${fixView === "diff" ? "seg-btn-on" : ""}`}
                >
                  diff
                </button>
              </div>
            )}
            {bf.fixed_code && onApplyFix ? (
              <button
                type="button"
                onClick={() => onApplyFix(bf.fixed_code)}
                className="btn-secondary text-[10px]"
                title="Replace selected file contents with fixed code"
              >
                Apply fix
              </button>
            ) : undefined}
          </div>
        }
      >
        {bf.summary && (
          <p className="mb-2 text-sm font-medium text-[var(--fg)]">{bf.summary}</p>
        )}
        {structured?.length ? (
          <div className="mb-3">
            <FindingList findings={structured} onJumpToLine={onJumpToLine} />
          </div>
        ) : bf.issues?.length > 0 ? (
          <ul className="mb-3 space-y-1.5">
            {bf.issues.map((issue, i) => (
              <li
                key={i}
                className="issue-card flex gap-2 border border-[var(--border)] bg-[var(--code-bg)] py-1.5 pl-3 pr-2.5 text-xs leading-relaxed text-[var(--fg-dim)] animate-fade-up"
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <span className="shrink-0 font-mono text-[var(--danger)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {bf.fixed_code && fixView === "diff" && originalCode ? (
          <DiffView before={originalCode} after={bf.fixed_code} maxHeight="360px" />
        ) : bf.fixed_code ? (
          <CodeBlock
            code={bf.fixed_code}
            language={language}
            maxHeight="320px"
            filename="fixed"
            downloadName="fixed"
            uiTheme={uiTheme}
          />
        ) : null}
      </PanelShell>
    );
  }

  if (taskId === "generate_tests") {
    if (result.tests == null) return <MissingCard label={label} />;
    const t = result.tests;
    return (
      <PanelShell
        title={label}
        accent="info"
        badge={t.framework}
        actions={
          t.code && onAddTests ? (
            <button
              type="button"
              onClick={() => onAddTests(t.code, t.framework)}
              className="btn-secondary text-[10px]"
              title="Add generated tests as a new file in the workspace"
            >
              Add as file
            </button>
          ) : undefined
        }
      >
        {t.coverage_notes?.length ? (
          <ul className="mb-3 space-y-1">
            {t.coverage_notes.map((n, i) => (
              <li
                key={i}
                className="font-mono text-[11px] text-[var(--muted)] before:mr-1.5 before:text-[var(--accent)] before:content-['▸']"
              >
                {n}
              </li>
            ))}
          </ul>
        ) : null}
        {t.code && (
          <CodeBlock
            code={t.code}
            language={inferTestLanguage(language, t.framework)}
            maxHeight="360px"
            filename={`tests (${t.framework})`}
            downloadName={
              language === "python"
                ? "test_generated.py"
                : language === "typescript" || language === "tsx"
                  ? "generated.test.ts"
                  : "generated.test.js"
            }
            uiTheme={uiTheme}
          />
        )}
      </PanelShell>
    );
  }

  if (taskId === "suggest_improvements") {
    if (result.improvements == null) return <MissingCard label={label} />;
    return (
      <PanelShell title={label} accent="ok">
        <ExpandableList items={result.improvements} />
      </PanelShell>
    );
  }

  if (taskId === "security_audit") {
    if (result.security == null) return <MissingCard label={label} />;
    const s = result.security;
    return (
      <PanelShell
        title={label}
        accent="danger"
        badge={s.risk_level}
      >
        {s.summary && (
          <p className="mb-3 text-sm font-medium text-[var(--fg)]">{s.summary}</p>
        )}
        <FindingList
          findings={s.findings}
          onJumpToLine={onJumpToLine}
          emptyLabel="No security issues identified."
        />
      </PanelShell>
    );
  }

  if (taskId === "architecture") {
    if (result.architecture == null) return <MissingCard label={label} />;
    const a = result.architecture;
    return (
      <PanelShell title={label} accent="info">
        {a.summary && (
          <p className="mb-3 text-sm leading-relaxed text-[var(--fg-dim)]">{a.summary}</p>
        )}
        <div className="mb-3 grid grid-cols-2 gap-2">
          <ArchMetric label="coupling" value={a.coupling} />
          <ArchMetric label="cohesion" value={a.cohesion} />
        </div>
        {a.hotspots?.length > 0 && (
          <div className="mb-3">
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-2)]">
              hotspots
            </p>
            <FindingList findings={a.hotspots} onJumpToLine={onJumpToLine} />
          </div>
        )}
        {a.recommendations?.length > 0 && (
          <div>
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-2)]">
              recommendations
            </p>
            <ExpandableList items={a.recommendations} />
          </div>
        )}
      </PanelShell>
    );
  }

  return null;
}

function ArchMetric({
  label,
  value,
}: {
  label: string;
  value: "low" | "medium" | "high";
}) {
  const tone =
    label === "cohesion"
      ? value === "high"
        ? "ok"
        : value === "medium"
          ? "warn"
          : "danger"
      : value === "low"
        ? "ok"
        : value === "medium"
          ? "warn"
          : "danger";
  const color =
    tone === "ok"
      ? "text-[var(--ok)] border-[var(--ok)]/30"
      : tone === "warn"
        ? "text-[var(--warn)] border-[var(--warn)]/30"
        : "text-[var(--danger)] border-[var(--danger)]/30";
  return (
    <div className={`border bg-[var(--code-bg)] px-2.5 py-2 ${color}`}>
      <div className="font-mono text-[9px] uppercase tracking-wide text-[var(--muted-2)]">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-[12px] font-semibold uppercase">{value}</div>
    </div>
  );
}

function MissingCard({ label }: { label: string }) {
  return (
    <PanelShell title={label} accent="muted">
      <p className="text-xs text-[var(--muted)]">
        This task was requested but missing from the model response.
      </p>
    </PanelShell>
  );
}

function NextSteps({
  result,
  checklist,
  onMarkReviewed,
  onApplyFix,
  onAddTests,
  onExport,
}: {
  result: AnalysisResult;
  checklist: { reviewed: boolean; fix: boolean; tests: boolean; export: boolean };
  onMarkReviewed: () => void;
  onApplyFix?: () => void;
  onAddTests?: () => void;
  onExport?: () => void;
}) {
  const hasFix = Boolean(result.bug_fixes?.fixed_code);
  const hasTests = Boolean(result.tests?.code);
  const steps = [
    {
      id: "reviewed",
      label: "Review findings",
      done: checklist.reviewed,
      action: onMarkReviewed,
      actionLabel: "Mark done",
    },
    hasFix
      ? {
          id: "fix",
          label: "Apply fix to source",
          done: checklist.fix,
          action: onApplyFix,
          actionLabel: "Apply",
        }
      : null,
    hasTests
      ? {
          id: "tests",
          label: "Add tests as file",
          done: checklist.tests,
          action: onAddTests,
          actionLabel: "Add",
        }
      : null,
    onExport
      ? {
          id: "export",
          label: "Export report",
          done: checklist.export,
          action: onExport,
          actionLabel: "Export md",
        }
      : null,
  ].filter(Boolean) as Array<{
    id: string;
    label: string;
    done: boolean;
    action?: () => void;
    actionLabel: string;
  }>;

  if (steps.length < 2) return null;
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  return (
    <div
      className={`next-steps animate-fade-up border border-[var(--border)] bg-[var(--surface)] p-3 ${
        allDone ? "next-steps-done" : ""
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-2)]">
          next steps
        </p>
        <span
          className={`font-mono text-[10px] tabular-nums ${
            allDone ? "text-[var(--ok)]" : "text-[var(--muted-2)]"
          }`}
        >
          {allDone ? "complete" : `${doneCount}/${steps.length}`}
        </span>
      </div>
      {allDone ? (
        <p className="font-mono text-[11px] text-[var(--ok)]">
          Nice — fix, tests, and export are handled. ⌘Z undoes workspace edits.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {steps.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-2 font-mono text-[11px]"
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] ${
                  s.done
                    ? "border-[var(--ok)] bg-[var(--ok-dim)] text-[var(--ok)]"
                    : "border-[var(--border)] text-[var(--muted-2)]"
                }`}
                aria-hidden
              >
                {s.done ? "✓" : ""}
              </span>
              <span
                className={
                  s.done ? "text-[var(--muted-2)] line-through" : "text-[var(--fg-dim)]"
                }
              >
                {s.label}
              </span>
              {!s.done && s.action && (
                <button
                  type="button"
                  onClick={s.action}
                  className="btn-ghost ml-auto !px-1.5 !py-0.5 text-[10px] text-[var(--accent)]"
                >
                  {s.actionLabel}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ExpandableProse({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 420 || text.split("\n").length > 8;
  return (
    <div>
      <p className={`prose-result ${long && !open ? "prose-result-clamp" : ""}`}>
        {text}
      </p>
      {long && (
        <button type="button" className="linkish mt-2" onClick={() => setOpen((v) => !v)}>
          {open ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}

function ExpandableList({ items }: { items: string[] }) {
  const [open, setOpen] = useState(false);
  const limit = 4;
  const visible = open || items.length <= limit ? items : items.slice(0, limit);
  const hidden = items.length - visible.length;
  return (
    <div>
      <ol className="space-y-2">
        {visible.map((item, i) => (
          <li
            key={i}
            className="tip-card flex gap-2.5 border border-[var(--border)] bg-[var(--code-bg)] px-2.5 py-2 text-sm leading-relaxed text-[var(--fg-dim)] animate-fade-up"
            style={{ animationDelay: `${i * 0.04}s` }}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-[var(--border)] bg-[var(--surface-2)] font-mono text-[10px] font-semibold text-[var(--accent)]">
              {i + 1}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
      {hidden > 0 && (
        <button type="button" className="linkish mt-2" onClick={() => setOpen(true)}>
          Show {hidden} more
        </button>
      )}
      {open && items.length > limit && (
        <button type="button" className="linkish mt-2 ml-3" onClick={() => setOpen(false)}>
          Show less
        </button>
      )}
    </div>
  );
}

function PanelShell({
  title,
  children,
  accent,
  badge,
  actions,
  copyText,
}: {
  title: string;
  children: React.ReactNode;
  accent: "info" | "danger" | "ok" | "muted";
  badge?: string;
  actions?: React.ReactNode;
  copyText?: string;
}) {
  const [copied, setCopied] = useState(false);
  const rails: Record<string, string> = {
    info: "panel-rail-info",
    danger: "panel-rail-danger",
    ok: "panel-rail-ok",
    muted: "panel-rail-default",
  };

  const onCopy = async () => {
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  };

  return (
    <section
      className={`result-panel animate-fade-up border border-[var(--border)] border-l-2 bg-[var(--surface)] ${rails[accent]}`}
    >
      <header className="flex items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--surface-2)]/80 px-3 py-1.5">
        <h3 className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--fg-dim)]">
          {title}
        </h3>
        <div className="flex items-center gap-1.5">
          {badge && (
            <span className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-1.5 py-0.5 font-mono text-[10px] uppercase text-[var(--muted)]">
              {badge}
            </span>
          )}
          {copyText && (
            <button
              type="button"
              onClick={() => void onCopy()}
              className="btn-ghost !px-1.5 !py-0.5 text-[10px]"
              title="Copy section"
            >
              {copied ? "copied" : "copy"}
            </button>
          )}
          {actions}
        </div>
      </header>
      <div className="p-3">{children}</div>
    </section>
  );
}

function ExportMenu({
  onExportMarkdown,
  onExportJson,
  onExportSarif,
}: {
  onExportMarkdown?: () => void;
  onExportJson?: () => void;
  onExportSarif?: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (!onExportMarkdown && !onExportJson && !onExportSarif) return null;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn-ghost !px-1.5 !py-0.5"
        title="Export"
      >
        export ▾
      </button>
      {open && (
        <div className="menu-panel absolute right-0 top-full z-30 mt-1 min-w-[7.5rem] py-1">
          {onExportMarkdown && (
            <button
              type="button"
              className="menu-item"
              onClick={() => {
                onExportMarkdown();
                setOpen(false);
              }}
            >
              Markdown
            </button>
          )}
          {onExportJson && (
            <button
              type="button"
              className="menu-item"
              onClick={() => {
                onExportJson();
                setOpen(false);
              }}
            >
              JSON
            </button>
          )}
          {onExportSarif && (
            <button
              type="button"
              className="menu-item"
              onClick={() => {
                onExportSarif();
                setOpen(false);
              }}
            >
              SARIF
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function RawOutputPanel({ rawText }: { rawText: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(async () => {
    await navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }, [rawText]);

  return (
    <div className="flex min-h-0 flex-1 flex-col border border-[var(--border)] bg-[var(--code-bg)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-2 py-1">
        <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--muted)]">
          raw output
        </span>
        <button type="button" onClick={onCopy} className="btn-secondary">
          {copied ? "ok" : "copy"}
        </button>
      </div>
      <pre className="max-h-[50vh] overflow-auto p-2 font-mono text-[11px] leading-relaxed text-[var(--fg-dim)] whitespace-pre-wrap">
        {rawText}
      </pre>
    </div>
  );
}

function inferTestLanguage(sourceLang: string, framework: string): string {
  const f = (framework || "").toLowerCase();
  if (f.includes("pytest") || f.includes("unittest") || sourceLang === "python") return "python";
  if (f.includes("jest") || f.includes("vitest") || f.includes("mocha")) {
    return sourceLang === "typescript" || sourceLang === "tsx" ? "typescript" : "javascript";
  }
  if (sourceLang === "typescript" || sourceLang === "tsx") return "typescript";
  if (sourceLang === "javascript" || sourceLang === "jsx") return "javascript";
  return sourceLang;
}
