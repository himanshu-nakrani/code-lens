"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CodeBlock } from "./CodeBlock";
import { DiffView } from "./DiffView";
import { Scorecard } from "./Scorecard";
import { FocusingPanel } from "./FocusingPanel";
import { ReadyPanel } from "./ReadyPanel";
import type { AnalysisResult, TaskId } from "@/lib/types";
import { ALL_TASKS } from "@/lib/types";
import type { CodeStats } from "@/lib/stats";
import { buildScorecard } from "@/lib/stats";
import { CountUp } from "./CountUp";

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
  onApplyFix?: (code: string) => void;
  onAddTests?: (code: string, framework: string) => void;
  onExportMarkdown?: () => void;
  onExportJson?: () => void;
  onRetry?: () => void;
  onCancel?: () => void;
  onAnalyze?: () => void;
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
  onApplyFix,
  onAddTests,
  onExportMarkdown,
  onExportJson,
  onRetry,
  onCancel,
  onAnalyze,
}: ResultsPanelProps) {
  const [activeTab, setActiveTab] = useState<"all" | TaskId>("all");
  const [stepIdx, setStepIdx] = useState(0);

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

  useEffect(() => {
    if (result && enabledTasks.length === 1) {
      setActiveTab(enabledTasks[0]);
    } else if (result) {
      setActiveTab("all");
    }
  }, [result, enabledTasks]);

  const stats = useMemo(() => {
    if (!result) return null;
    return {
      issues: result.bug_fixes?.issues?.length ?? 0,
      improvements: result.improvements?.length ?? 0,
      hasFix: Boolean(result.bug_fixes?.fixed_code),
      hasTests: Boolean(result.tests?.code),
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
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--danger)]">
          error
        </p>
        <p className="text-[12px] font-medium text-[var(--danger)]">Analysis failed</p>
        <p className="max-w-sm text-xs leading-relaxed text-[var(--muted)] whitespace-pre-wrap">
          {error}
        </p>
        {error.includes("XAI_API_KEY") && (
          <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-left font-mono text-[11px] text-[var(--fg-dim)]">
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
      label: ALL_TASKS.find((t) => t.id === id)?.label ?? id,
    })),
  ];

  const visibleTasks =
    activeTab === "all" ? enabledTasks : enabledTasks.filter((t) => t === activeTab);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Summary strip */}
      <div className="shrink-0 border-b border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-[var(--muted)]">
          {stats && (
            <>
              {stats.issues > 0 && (
                <span className="text-[var(--danger)]">
                  <CountUp value={stats.issues} /> issue
                  {stats.issues === 1 ? "" : "s"}
                </span>
              )}
              {stats.hasFix && <span className="text-[var(--danger)]">fix</span>}
              {stats.hasTests && <span className="text-[var(--accent)]">tests</span>}
              {stats.improvements > 0 && (
                <span className="text-[var(--ok)]">
                  <CountUp value={stats.improvements} /> tips
                </span>
              )}
              {durationMs != null && (
                <span className="tabular-nums">{(durationMs / 1000).toFixed(1)}s</span>
              )}
            </>
          )}
          <div className="ml-auto flex gap-1">
            {onExportMarkdown && (
              <button type="button" onClick={onExportMarkdown} className="btn-ghost !px-1.5 !py-0.5">
                md
              </button>
            )}
            {onExportJson && (
              <button type="button" onClick={onExportJson} className="btn-ghost !px-1.5 !py-0.5">
                json
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex shrink-0 gap-0 overflow-x-auto border-b border-[var(--border)] px-1">
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

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        {scorecard && activeTab === "all" && (
          <div className="animate-fade-up">
            <Scorecard
              score={scorecard.score}
              grade={scorecard.grade}
              notes={scorecard.notes}
              stats={sourceStats}
            />
          </div>
        )}
        {visibleTasks.map((taskId, i) => (
          <div key={taskId} className={`animate-fade-up stagger-${Math.min(i + 1, 4)}`}>
            <TaskResultCard
              taskId={taskId}
              result={result}
              language={language}
              originalCode={originalCode}
              onApplyFix={onApplyFix}
              onAddTests={onAddTests}
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
}: {
  taskId: TaskId;
  result: AnalysisResult;
  language: string;
  originalCode: string;
  onApplyFix?: (code: string) => void;
  onAddTests?: (code: string, framework: string) => void;
}) {
  const [fixView, setFixView] = useState<"code" | "diff">("code");
  const meta = ALL_TASKS.find((t) => t.id === taskId);
  const label = meta?.label ?? taskId;

  if (taskId === "explain") {
    if (result.explanation == null) return <MissingCard label={label} />;
    return (
      <PanelShell title={label} accent="info">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--fg-dim)]">
          {result.explanation}
        </p>
      </PanelShell>
    );
  }

  if (taskId === "fix_bugs") {
    if (result.bug_fixes == null) return <MissingCard label={label} />;
    const bf = result.bug_fixes;
    const showDiff = Boolean(bf.fixed_code && originalCode);
    return (
      <PanelShell
        title={label}
        accent="danger"
        actions={
          <div className="flex items-center gap-1">
            {showDiff && (
              <div className="mr-1 flex border border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setFixView("code")}
                  className={`px-1.5 py-0.5 font-mono text-[10px] uppercase ${
                    fixView === "code"
                      ? "bg-[var(--accent-dim)] text-[var(--accent)]"
                      : "text-[var(--muted)]"
                  }`}
                >
                  code
                </button>
                <button
                  type="button"
                  onClick={() => setFixView("diff")}
                  className={`border-l border-[var(--border)] px-1.5 py-0.5 font-mono text-[10px] uppercase ${
                    fixView === "diff"
                      ? "bg-[var(--accent-dim)] text-[var(--accent)]"
                      : "text-[var(--muted)]"
                  }`}
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
        {bf.issues?.length > 0 && (
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
        )}
        {bf.fixed_code && fixView === "diff" && originalCode ? (
          <DiffView before={originalCode} after={bf.fixed_code} maxHeight="360px" />
        ) : bf.fixed_code ? (
          <CodeBlock
            code={bf.fixed_code}
            language={language}
            maxHeight="320px"
            filename="fixed"
            downloadName="fixed"
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
          />
        )}
      </PanelShell>
    );
  }

  if (taskId === "suggest_improvements") {
    if (result.improvements == null) return <MissingCard label={label} />;
    return (
      <PanelShell title={label} accent="ok">
        <ol className="space-y-2">
          {result.improvements.map((item, i) => (
            <li
              key={i}
              className="tip-card flex gap-2.5 border border-[var(--border)] bg-[var(--code-bg)] px-2.5 py-2 text-sm leading-relaxed text-[var(--fg-dim)] animate-fade-up"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-[var(--border)] bg-[var(--surface-2)] font-mono text-[10px] font-semibold text-[var(--accent)]">
                {i + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      </PanelShell>
    );
  }

  return null;
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

function PanelShell({
  title,
  children,
  accent,
  badge,
  actions,
}: {
  title: string;
  children: React.ReactNode;
  accent: "info" | "danger" | "ok" | "muted";
  badge?: string;
  actions?: React.ReactNode;
}) {
  const rails: Record<string, string> = {
    info: "panel-rail-info",
    danger: "panel-rail-danger",
    ok: "panel-rail-ok",
    muted: "panel-rail-default",
  };
  return (
    <section
      className={`result-panel animate-fade-up border border-[var(--border)] border-l-2 bg-[var(--surface)] ${rails[accent]}`}
    >
      <header className="flex items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5">
        <h3 className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--fg-dim)]">
          {title}
        </h3>
        <div className="flex items-center gap-1.5">
          {badge && (
            <span className="border border-[var(--border)] bg-[var(--bg)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted)]">
              {badge}
            </span>
          )}
          {actions}
        </div>
      </header>
      <div className="p-3">{children}</div>
    </section>
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
