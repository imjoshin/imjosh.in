"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function BlobCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const theme = matchMedia("(prefers-color-scheme: dark)");
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let generation = 0;
    let destroy: (() => void) | undefined;

    function syncTheme() {
      document.documentElement.dataset.theme = theme.matches ? "dark" : "light";
    }

    function stop() {
      generation++;
      if (!destroy) return;
      destroy();
      destroy = undefined;
      // The supplied renderer stays untouched; release its GPU resources here.
      const gl = canvas!.getContext("webgl");
      if (!gl || gl.isContextLost()) return;
      const program = gl.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram | null;
      const buffer = gl.getParameter(gl.ARRAY_BUFFER_BINDING) as WebGLBuffer | null;
      if (program) {
        for (const shader of gl.getAttachedShaders(program) ?? []) gl.deleteShader(shader);
        gl.deleteProgram(program);
      }
      if (buffer) gl.deleteBuffer(buffer);
    }

    async function syncAnimation() {
      stop();
      canvas!.style.visibility = motion.matches ? "hidden" : "visible";
      if (disposed || motion.matches || document.hidden) return;
      const current = generation;
      try {
        const { initBlob } = await import("@/lib/blob.js");
        if (disposed || current !== generation) return;
        destroy = initBlob(canvas!, { count: 7, pull: .24 });
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

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 block h-dvh w-full transition-opacity duration-800 motion-reduce:hidden" style={{ opacity: pathname === "/" ? 1 : .5 }} />;
}
