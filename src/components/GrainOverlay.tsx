"use client";

/** Subtle film grain for depth — pure CSS, no images. */
export function GrainOverlay() {
  return <div className="grain-overlay pointer-events-none fixed inset-0 z-[1]" aria-hidden />;
}
