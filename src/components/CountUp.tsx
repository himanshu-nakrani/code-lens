"use client";

import { useEffect, useState } from "react";

export function CountUp({
  value,
  duration = 500,
  className = "",
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const [n, setN] = useState(0);

  useEffect(() => {
    setN(0);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className={`tabular-nums ${className}`}>{n}</span>;
}
