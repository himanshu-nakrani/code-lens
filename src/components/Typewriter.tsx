"use client";

import { useEffect, useState } from "react";

/** Simple typewriter for hero copy — client-only after mount. */
export function Typewriter({
  text,
  speed = 28,
  className = "",
}: {
  text: string;
  speed?: number;
  className?: string;
}) {
  const [n, setN] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setN(0);
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setN(i);
      if (i >= text.length) {
        clearInterval(id);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);

  return (
    <span className={className}>
      {text.slice(0, n)}
      <span className={`type-caret ${done ? "type-caret-done" : ""}`} aria-hidden>
        ▍
      </span>
    </span>
  );
}
