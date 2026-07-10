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
    <div className="pointer-events-none fixed bottom-8 right-3 z-50 flex w-[min(320px,calc(100vw-1.5rem))] flex-col gap-1">
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
    const t = setTimeout(() => onDismiss(toast.id), 3200);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  const border =
    toast.kind === "success"
      ? "border-[var(--ok)]"
      : toast.kind === "error"
        ? "border-[var(--danger)]"
        : "border-[var(--accent)]";

  const label =
    toast.kind === "success" ? "ok" : toast.kind === "error" ? "err" : "info";

  return (
    <div
      className={`pointer-events-auto animate-slide-in border border-l-2 ${border} bg-[var(--surface)] px-2.5 py-1.5 font-mono text-[11px] text-[var(--fg)]`}
      role="status"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="leading-relaxed">
          <span className="mr-2 text-[var(--muted-2)]">{label}</span>
          {toast.text}
        </span>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="shrink-0 text-[var(--muted-2)] hover:text-[var(--fg)]"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
