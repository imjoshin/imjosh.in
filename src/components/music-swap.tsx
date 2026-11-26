"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Keep outgoing content mounted until its exit finishes. Rapid changes keep only the latest view. */
export function MusicSwap({ identity, children, className = "" }: { identity: string; children: ReactNode; className?: string }) {
  const [shown, setShown] = useState({ identity, children });
  const [phase, setPhase] = useState("idle");
  const latest = useRef(children);
  latest.current = children;
  useEffect(() => {
    if (identity === shown.identity) { setPhase(value => value === "out" ? "idle" : value); return; }
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reveal = () => { setShown({ identity, children: latest.current }); setPhase(motion.matches ? "idle" : "in"); };
    if (motion.matches) reveal();
    else { setPhase("out"); timer = setTimeout(reveal, 150); }
    const onMotion = () => { if (motion.matches) { clearTimeout(timer); reveal(); } };
    motion.addEventListener("change", onMotion);
    return () => { clearTimeout(timer); motion.removeEventListener("change", onMotion); };
  }, [identity, shown.identity]);
  return <div className={`music-swap ${className}`} data-phase={phase} inert={phase === "out" || undefined}>
    <div key={shown.identity} className="music-swap-content">{shown.identity === identity ? children : shown.children}</div>
  </div>;
}
