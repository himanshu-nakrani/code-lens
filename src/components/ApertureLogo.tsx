"use client";

/** Animated optical aperture mark for Code Lens. */
export function ApertureLogo({ spinning = false }: { spinning?: boolean }) {
  return (
    <div
      className={`aperture-logo ${spinning ? "aperture-logo-spin" : ""}`}
      aria-hidden
    >
      <svg viewBox="0 0 40 40" width="28" height="28" fill="none">
        <circle cx="20" cy="20" r="17" className="aperture-ring" />
        <circle cx="20" cy="20" r="11" className="aperture-ring aperture-ring-inner" />
        {/* Iris blades */}
        <g className="aperture-blades">
          <path d="M20 9 L27 16 L20 18 Z" />
          <path d="M31 20 L24 27 L22 20 Z" />
          <path d="M20 31 L13 24 L20 22 Z" />
          <path d="M9 20 L16 13 L18 20 Z" />
        </g>
        <circle cx="20" cy="20" r="3.5" className="aperture-core" />
      </svg>
    </div>
  );
}
