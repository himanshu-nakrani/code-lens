"use client";

import { useEffect, useRef } from "react";

/** Cursor-following optical spotlight — pure CSS vars, no canvas. */
export function LensBackdrop({ active = true }: { active?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      el.style.setProperty("--lx", `${x}%`);
      el.style.setProperty("--ly", `${y}%`);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [active]);

  if (!active) return null;

  return (
    <div
      ref={ref}
      className="lens-backdrop pointer-events-none fixed inset-0 z-0"
      aria-hidden
    />
  );
}
