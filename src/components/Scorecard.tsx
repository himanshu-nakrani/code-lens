"use client";

import { useEffect, useState } from "react";
import type { CodeStats, Scorecard as ScorecardData } from "@/lib/stats";
import { SeverityStrip } from "./FindingList";

interface ScorecardProps {
  score: number;
  grade: string;
  notes: string[];
  stats: CodeStats | null;
  dimensions?: ScorecardData["dimensions"];
  severityCounts?: ScorecardData["severityCounts"];
  /** When true, start with spectrum collapsed (calm default). */
  calm?: boolean;
  /** Score change vs previous run (positive = improved). */
  scoreDelta?: number | null;
}

const DIM_LABELS: { key: keyof NonNullable<ScorecardProps["dimensions"]>; label: string }[] = [
  { key: "correctness", label: "correct" },
  { key: "security", label: "secure" },
  { key: "maintainability", label: "maint" },
  { key: "testability", label: "test" },
  { key: "complexity", label: "cx" },
];

export function Scorecard({
  score,
  grade,
  notes,
  stats,
  dimensions,
  severityCounts,
  calm = true,
  scoreDelta = null,
}: ScorecardProps) {
  const [display, setDisplay] = useState(0);
  const [spectrumOpen, setSpectrumOpen] = useState(!calm);
  const tone = score >= 80 ? "ok" : score >= 60 ? "accent" : "danger";
  const stroke =
    tone === "ok"
      ? "var(--ok)"
      : tone === "accent"
        ? "var(--accent)"
        : "var(--danger)";

  useEffect(() => {
    setDisplay(0);
    const start = performance.now();
    const dur = 700;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(score * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const r = 22;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, display)) / 100) * c;

  return (
    <div className="scorecard-panel border border-[var(--border)] p-3">
      <div className="flex items-center gap-3">
        <div className="relative h-14 w-14 shrink-0">
          <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
            <circle
              cx="28"
              cy="28"
              r={r}
              fill="none"
              stroke="var(--border)"
              strokeWidth="3"
            />
            <circle
              cx="28"
              cy="28"
              r={r}
              fill="none"
              stroke={stroke}
              strokeWidth="3"
              strokeLinecap="butt"
              strokeDasharray={c}
              strokeDashoffset={offset}
              className="score-arc"
              style={{ filter: `drop-shadow(0 0 6px ${stroke})` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
            <span className="text-base font-semibold leading-none text-[var(--fg)]">
              {grade}
            </span>
            <span className="mt-0.5 text-[9px] tabular-nums text-[var(--muted)]">
              {display}
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted-2)]">
              quality
            </p>
            {scoreDelta != null && scoreDelta !== 0 && (
              <span
                className={`font-mono text-[10px] tabular-nums ${
                  scoreDelta > 0 ? "text-[var(--ok)]" : "text-[var(--danger)]"
                }`}
                title="Change vs previous run"
              >
                {scoreDelta > 0 ? "▲" : "▼"}
                {Math.abs(scoreDelta)}
              </span>
            )}
          </div>
          {stats && (
            <p className="mt-1 font-mono text-[11px] text-[var(--muted)]">
              {stats.code} loc · {stats.functions} fn · {stats.complexityHint} cx
            </p>
          )}
          {severityCounts && (
            <div className="mt-2">
              <SeverityStrip counts={severityCounts} />
            </div>
          )}
        </div>
      </div>

      {dimensions && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setSpectrumOpen((v) => !v)}
            className="font-mono text-[10px] uppercase tracking-wide text-[var(--muted-2)] hover:text-[var(--accent)]"
          >
            {spectrumOpen ? "▾ spectrum" : "▸ spectrum"}
          </button>
          {spectrumOpen && (
            <div className="mt-2 space-y-1.5">
              {DIM_LABELS.map(({ key, label }) => {
                const v = dimensions[key] ?? 0;
                const inverted = key === "complexity";
                const good = inverted ? v < 40 : v >= 70;
                const mid = inverted ? v < 65 : v >= 50;
                const barColor = good
                  ? "var(--ok)"
                  : mid
                    ? "var(--warn)"
                    : "var(--danger)";
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="w-12 shrink-0 font-mono text-[9px] uppercase tracking-wide text-[var(--muted-2)]">
                      {label}
                    </span>
                    <div className="h-1 min-w-0 flex-1 overflow-hidden bg-[var(--border)]">
                      <div
                        className="dim-bar h-full transition-all duration-700"
                        style={{
                          width: `${v}%`,
                          background: barColor,
                          boxShadow: `0 0 6px ${barColor}`,
                        }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right font-mono text-[10px] tabular-nums text-[var(--muted)]">
                      {v}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Calm: hide redundant tip chips unless spectrum expanded */}
      {spectrumOpen && notes.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {notes.slice(0, 4).map((n) => (
            <li key={n} className="tip-chip !py-0.5">
              {n}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
