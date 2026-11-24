"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { BlobController } from "@/lib/blob";

export function BlobCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const pathname = usePathname();
  const isHome = pathname === "/";
  const home = useRef(isHome);
  const engine = useRef<BlobController | null>(null);

  useEffect(() => {
    home.current = isHome;
    engine.current?.setHome(isHome);
  }, [isHome]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const theme = matchMedia("(prefers-color-scheme: dark)");
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let generation = 0;

    function syncTheme() {
      document.documentElement.dataset.theme = theme.matches ? "dark" : "light";
    }

    function stop() {
      generation++;
      engine.current?.destroy();
      engine.current = null;
    }

    async function syncAnimation() {
      const current = ++generation;
      canvas!.style.visibility = motion.matches ? "hidden" : "visible";
      if (engine.current) {
        engine.current.setPaused(motion.matches || document.hidden);
        return;
      }
      if (disposed || motion.matches || document.hidden) return;
      try {
        const { initBlob } = await import("@/lib/blob.js");
        if (disposed || current !== generation) return;
        engine.current = initBlob(canvas!, { count: 7, pull: .24, home: home.current });
      } catch {
        // The typography and navigation remain complete without WebGL.
      }
    }

    function onContextLost(event: Event) { event.preventDefault(); stop(); }
    syncTheme();
    const firstFrame = requestAnimationFrame(() => void syncAnimation());
    theme.addEventListener("change", syncTheme);
    motion.addEventListener("change", syncAnimation);
    document.addEventListener("visibilitychange", syncAnimation);
    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", syncAnimation);
    return () => {
      disposed = true;
      cancelAnimationFrame(firstFrame);
      stop();
      theme.removeEventListener("change", syncTheme);
      motion.removeEventListener("change", syncAnimation);
      document.removeEventListener("visibilitychange", syncAnimation);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", syncAnimation);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" data-dimmed={!isHome} className="blob-canvas pointer-events-none fixed inset-0 z-0 block h-dvh w-full motion-reduce:hidden" />;
}
