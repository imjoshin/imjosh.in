"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { BlobController } from "@/lib/blob";
import styles from "./blob-canvas.module.css";
import { countEvent, trackEvent } from "@/lib/analytics";

const THEME_STORAGE_KEY = "imjosh.in:theme";

export function BlobCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const pathname = usePathname();
  const isHome = pathname === "/";
  const home = useRef(isHome);
  const engine = useRef<BlobController | null>(null);
  const [showPewHint, setShowPewHint] = useState(false);

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
      let override: string | null = null;
      try { override = window.localStorage.getItem(THEME_STORAGE_KEY); } catch { /* Follow the OS when storage is unavailable. */ }
      document.documentElement.dataset.theme = override === "light" || override === "dark"
        ? override : theme.matches ? "dark" : "light";
    }

    function onStorage(event: StorageEvent) {
      if (event.key === THEME_STORAGE_KEY || event.key === null) syncTheme();
    }

    function stop() {
      generation++;
      engine.current?.destroy();
      engine.current = null;
    }

    async function syncAnimation() {
      syncTheme();
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
        engine.current = initBlob(canvas!, { count: 7, pull: .24, home: home.current, onPewHintChange: setShowPewHint,
          onInteraction: (event, params) => {
            const context = { ...params, page_path: "/" };
            if (event === "pew_shot" || event === "pew_hit" || event === "blob_burst") countEvent(event, context);
            else trackEvent(event, context);
          },
        });
      } catch {
        // The typography and navigation remain complete without WebGL.
      }
    }

    function onContextLost(event: Event) { event.preventDefault(); stop(); }
    syncTheme();
    const firstFrame = requestAnimationFrame(() => void syncAnimation());
    theme.addEventListener("change", syncTheme);
    window.addEventListener("storage", onStorage);
    motion.addEventListener("change", syncAnimation);
    document.addEventListener("visibilitychange", syncAnimation);
    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", syncAnimation);
    return () => {
      disposed = true;
      cancelAnimationFrame(firstFrame);
      stop();
      theme.removeEventListener("change", syncTheme);
      window.removeEventListener("storage", onStorage);
      motion.removeEventListener("change", syncAnimation);
      document.removeEventListener("visibilitychange", syncAnimation);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", syncAnimation);
    };
  }, []);

  return <>
    <canvas ref={ref} aria-hidden="true" data-dimmed={!isHome} className="blob-canvas pointer-events-none fixed inset-0 z-0 block h-dvh w-full motion-reduce:hidden" />
    {isHome && showPewHint && <div className={`${styles.hint} pointer-events-none fixed inset-x-0 bottom-1 z-20 text-center lg:bottom-3`} role="status">
      <span className="inline-block rounded-full border border-line bg-panel px-3 py-1 text-xs text-muted backdrop-blur-sm">type &quot;pew&quot;</span>
    </div>}
  </>;
}
