"use client";

import { useCallback, useRef } from "react";

interface ResizeHandleProps {
  /** CSS custom property name to update, e.g. --files-w */
  cssVar: string;
  min?: number;
  max?: number;
  /** Which edge: files (left) grows to the right; results grows to the left */
  direction?: "right" | "left";
}

/**
 * Drag handle for resizable panes. Updates a CSS variable in px on :root.
 */
export function ResizeHandle({
  cssVar,
  min = 180,
  max = 480,
  direction = "right",
}: ResizeHandleProps) {
  const dragging = useRef(false);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      dragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      const startX = e.clientX;
      const start =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(cssVar)
        ) || (direction === "right" ? 260 : 380);

      const onMove = (ev: PointerEvent) => {
        if (!dragging.current) return;
        const dx =
          direction === "right" ? ev.clientX - startX : startX - ev.clientX;
        const next = Math.min(max, Math.max(min, start + dx));
        document.documentElement.style.setProperty(cssVar, `${next}px`);
      };
      const onUp = () => {
        dragging.current = false;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        try {
          const v = getComputedStyle(document.documentElement).getPropertyValue(
            cssVar
          );
          localStorage.setItem(`code-lens-pane${cssVar}`, v.trim());
        } catch {
          /* ignore */
        }
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [cssVar, min, max, direction]
  );

  return (
    <div
      className="resize-handle"
      onPointerDown={onPointerDown}
      role="separator"
      aria-orientation="vertical"
      title="Drag to resize"
    />
  );
}

export function restorePaneWidths(): void {
  try {
    for (const key of ["--files-w", "--results-w"]) {
      const v = localStorage.getItem(`code-lens-pane${key}`);
      if (v && /^\d+(\.\d+)?px$/.test(v)) {
        document.documentElement.style.setProperty(key, v);
      }
    }
  } catch {
    /* ignore */
  }
}
