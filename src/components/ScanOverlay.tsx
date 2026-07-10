"use client";

/** Full-width scan beam while analysis is running. */
export function ScanOverlay({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="scan-overlay pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden>
      <div className="scan-beam" />
      <div className="scan-vignette" />
    </div>
  );
}
