"use client";

import { useEffect, useRef, type PointerEvent } from "react";

export function useMusicChartInteraction<T extends Element>(active: boolean, dismiss: () => void, inspect?: (event: PointerEvent<T>) => void) {
  const surface = useRef<HTMLDivElement>(null);
  const touch = useRef<{ id: number; x: number; y: number } | null>(null);
  useEffect(() => {
    if (!active) return;
    const outside = (event: globalThis.PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && !surface.current?.contains(target) && !target.closest(".music-entity-card")) dismiss();
    };
    document.addEventListener("pointerdown", outside, true);
    return () => document.removeEventListener("pointerdown", outside, true);
  }, [active, dismiss]);
  return {
    ref: surface,
    onPointerDown(event: PointerEvent<T>) {
      if (event.pointerType !== "touch") { inspect?.(event); return; }
      touch.current = event.isPrimary ? { id: event.pointerId, x: event.clientX, y: event.clientY } : null;
      dismiss();
    },
    onPointerMove(event: PointerEvent<T>) {
      if (event.pointerType !== "touch") { inspect?.(event); return; }
      const start = touch.current;
      if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) touch.current = null;
    },
    onPointerUp(event: PointerEvent<T>) {
      if (event.pointerType !== "touch") return;
      const start = touch.current;
      touch.current = null;
      if (start?.id === event.pointerId && Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 10) inspect?.(event);
    },
    onPointerCancel() { touch.current = null; dismiss(); },
  };
}
