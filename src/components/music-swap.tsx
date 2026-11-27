"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

const ReadyContext = createContext<boolean | null>(null);

/** Prepare the actual incoming DOM before starting any of a group's swaps. */
export function MusicSwapGroup({ identity, children }: { identity: string; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [readyIdentity, setReadyIdentity] = useState(identity);
  useEffect(() => {
    if (identity === readyIdentity) return;
    let cancelled = false, frame = 0;
    const images = [...root.current!.querySelectorAll<HTMLImageElement>("[data-music-swap-pending] img")];
    // decode() also waits for loading. Failed artwork must not block song updates.
    void Promise.allSettled(images.map(image => image.decode())).then(() => {
      if (!cancelled) frame = requestAnimationFrame(() => setReadyIdentity(identity));
    });
    return () => { cancelled = true; cancelAnimationFrame(frame); };
  }, [identity, readyIdentity]);
  return <ReadyContext.Provider value={identity === readyIdentity}><div ref={root} style={{ display: "contents" }}>{children}</div></ReadyContext.Provider>;
}

/** Keep outgoing content mounted until its exit finishes. Rapid changes keep only the latest view. */
export function MusicSwap({ identity, children, className = "" }: { identity: string; children: ReactNode; className?: string }) {
  const ready = useContext(ReadyContext);
  const [shown, setShown] = useState({ identity, children });
  const [phase, setPhase] = useState("idle");
  const latest = useRef(children);
  latest.current = children;
  useEffect(() => {
    if (identity === shown.identity) { setPhase(value => value === "out" ? "idle" : value); return; }
    if (ready === false) { setPhase("idle"); return; }
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reveal = () => { setShown({ identity, children: latest.current }); setPhase(motion.matches ? "idle" : "in"); };
    if (motion.matches) reveal();
    else { setPhase("out"); timer = setTimeout(reveal, 150); }
    const onMotion = () => { if (motion.matches) { clearTimeout(timer); reveal(); } };
    motion.addEventListener("change", onMotion);
    return () => { clearTimeout(timer); motion.removeEventListener("change", onMotion); };
  }, [identity, shown.identity, ready]);
  return <div className={`music-swap ${className}`} data-phase={phase} inert={phase === "out" || undefined}>
    {[{ ...shown, pending: false }, ...(ready !== null && identity !== shown.identity ? [{ identity, children, pending: true }] : [])].map(view => <div key={view.identity} className="music-swap-content" data-music-swap-pending={view.pending || undefined} aria-hidden={view.pending || undefined} inert={view.pending || undefined} style={view.pending ? { position: "absolute", width: "100%", visibility: "hidden", pointerEvents: "none", animation: "none" } : undefined}>{view.pending || view.identity === identity ? children : view.children}</div>)}
  </div>;
}
