"use client";

/** Decorative activity bars — pure CSS, no canvas. */
export function Spectrogram({ active, bars = 12 }: { active: boolean; bars?: number }) {
  return (
    <div
      className={`spectro ${active ? "spectro-live" : ""}`}
      aria-hidden
      style={{ ["--bars" as string]: bars }}
    >
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className="spectro-bar"
          style={{ animationDelay: `${i * 0.07}s`, ["--h" as string]: `${30 + ((i * 17) % 70)}%` }}
        />
      ))}
    </div>
  );
}
