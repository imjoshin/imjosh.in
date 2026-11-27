"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/** Reveal overflowing names in place without duplicating their links or accessible text. */
export function MusicScrollingText({ text, children, className = "" }: { text: string; children: ReactNode; className?: string }) {
  const viewport = useRef<HTMLParagraphElement>(null), content = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(0);
  useLayoutEffect(() => {
    const outer = viewport.current, inner = content.current;
    if (!outer || !inner) return;
    let active = true;
    const measure = () => {
      if (active) setOverflow(Math.max(0, Math.ceil(inner.scrollWidth - outer.clientWidth)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(outer); observer.observe(inner);
    void document.fonts.ready.then(measure);
    return () => { active = false; observer.disconnect(); };
  }, [text]);
  const style = {
    "--music-text-offset": `${-overflow}px`,
    // Spend 60% of each pass moving at about 24px/s, with a pause at both ends.
    "--music-text-duration": `${Math.max(4, overflow / 24 / .6)}s`,
  } as CSSProperties;
  return <p ref={viewport} className={`music-scrolling-text ${className}`} title={text} data-overflow={overflow > 0 || undefined} style={style} onFocus={event => event.target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" })}>
    <span ref={content} className="music-scrolling-text-content">{children}</span>
  </p>;
}
