"use client";

import { useEffect } from "react";

export type ToastKind = "success" | "error" | "info";

export interface ToastMessage {
  id: number;
  kind: ToastKind;
  text: string;
}

interface ToastStackProps {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  return (
    <div
      className="pointer-events-none fixed bottom-10 right-3 z-50 flex w-[min(300px,calc(100vw-1.5rem))] flex-col gap-1.5"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 2600);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  const rail =
    toast.kind === "success"
      ? "border-l-[var(--ok)]"
      : toast.kind === "error"
        ? "border-l-[var(--danger)]"
        : "border-l-[var(--accent)]";

  const label =
    toast.kind === "success" ? "ok" : toast.kind === "error" ? "err" : "info";

  const labelColor =
    toast.kind === "success"
      ? "text-[var(--ok)]"
      : toast.kind === "error"
        ? "text-[var(--danger)]"
        : "text-[var(--accent)]";

  return (
    <div
      className={`toast-item pointer-events-auto animate-slide-in border border-[var(--border)] border-l-2 ${rail} bg-[var(--surface)]/95 px-2.5 py-2 font-mono text-[11px] text-[var(--fg)]`}
      role="status"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="leading-relaxed">
          <span className={`mr-2 font-semibold uppercase tracking-wide ${labelColor}`}>
            {label}
          </span>
          <span className="text-[var(--fg-dim)]">{toast.text}</span>
        </span>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="shrink-0 rounded-[var(--radius)] px-1 text-[var(--muted-2)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
    </div>
  );
}
