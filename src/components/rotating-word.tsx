"use client";

import { useEffect, useState } from "react";

const words = ["interesting", "weird", "stubborn", "gnarly", "fun", "interesting"];

export function RotatingWord() {
  const [slot, setSlot] = useState({ index: 0, snap: false });

  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let interval: ReturnType<typeof setInterval> | undefined;
    let reset: ReturnType<typeof setTimeout> | undefined;
    let index = 0;
    function sync() {
      clearInterval(interval);
      clearTimeout(reset);
      index = 0;
      setSlot({ index: 0, snap: true });
      if (motion.matches) return;
      interval = setInterval(() => {
        index++;
        setSlot({ index, snap: false });
        if (index === words.length - 1) {
          reset = setTimeout(() => {
            index = 0;
            setSlot({ index: 0, snap: true });
          }, 700);
        }
      }, 2300);
    }
    sync();
    motion.addEventListener("change", sync);
    return () => {
      clearInterval(interval);
      clearTimeout(reset);
      motion.removeEventListener("change", sync);
    };
  }, []);

  return (
    <span className="inline-flex h-[1.25em] overflow-hidden align-bottom text-accent">
      <span className="sr-only">interesting</span>
      <span aria-hidden="true" className="flex flex-col font-display italic" style={{ transform: `translateY(${-slot.index * 1.25}em)`, transition: slot.snap ? "none" : "transform .65s cubic-bezier(.75,0,.2,1)" }}>
        {words.map((word, i) => <span key={i} className="h-[1.25em] shrink-0 leading-[1.25em]">{word}</span>)}
      </span>
    </span>
  );
}
