"use client";

import { useEffect, useState } from "react";

/** Brief phosphor particle burst when analysis locks. */
export function LockBurst({ trigger }: { trigger: number | null }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (trigger == null) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 900);
    return () => clearTimeout(t);
  }, [trigger]);

  if (!show) return null;

  return (
    <div className="lock-burst" aria-hidden>
      {Array.from({ length: 12 }).map((_, i) => (
        <span
          key={i}
          className="lock-burst-dot"
          style={{
            ["--a" as string]: `${i * 30}deg`,
            ["--d" as string]: `${28 + (i % 3) * 10}px`,
            animationDelay: `${i * 0.02}s`,
          }}
        />
      ))}
    </div>
  );
}
