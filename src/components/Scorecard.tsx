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
}: ScorecardProps) {
  const [display, setDisplay] = useState(0);
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

  // SVG arc gauge
  const r = 22;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, display)) / 100) * c;

  return (
    <div className="scorecard-panel border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="flex items-center gap-3">
        <div className="relative h-16 w-16 shrink-0">
          <svg viewBox="0 0 56 56" className="h-16 w-16 -rotate-90">
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
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted-2)]">
            quality spectrum
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">
            Multi-axis · findings + source shape
          </p>
          {stats && (
            <div className="mt-2 grid grid-cols-4 gap-1">
              <Metric label="loc" value={String(stats.code)} />
              <Metric label="fn" value={String(stats.functions)} />
              <Metric label="cx" value={stats.complexityHint} />
              <Metric label="br" value={String(stats.branches)} />
            </div>
          )}
        </div>
      </div>

      {dimensions && (
        <div className="mt-3 space-y-1.5">
          {DIM_LABELS.map(({ key, label }) => {
            const v = dimensions[key] ?? 0;
            // complexity: high is bad — show inverted color
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

      {severityCounts && (
        <div className="mt-3">
          <SeverityStrip counts={severityCounts} />
        </div>
      )}

      {notes.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {notes.map((n) => (
            <li key={n} className="tip-chip !py-0.5">
              {n}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--border)] bg-[var(--bg)] px-1.5 py-1 text-center">
      <div className="font-mono text-[11px] text-[var(--fg)]">{value}</div>
      <div className="font-mono text-[9px] uppercase tracking-wide text-[var(--muted-2)]">
        {label}
      </div>
    </div>
  );
}
