"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { morphMusicLine, type MusicChartPoint } from "@/lib/music/chart-interaction";

const duration = 480;
const ease = (progress: number) => 1 - (1 - progress) ** 3;
const number = new Intl.NumberFormat("en-US");
type Phase = "present" | "enter" | "exit";
export interface MusicPresence<T> { item: T; phase: Phase }

/** First visits render immediately. Updates retarget from the current frame, including interrupted updates. */
export function useMusicLineMotion(target: MusicChartPoint[], baseline: number, enter = false) {
  const encoded = JSON.stringify(target);
  const [points, setPoints] = useState(() => enter ? target.map(point => ({ ...point, y: baseline })) : target);
  const current = useRef(points);
  useLayoutEffect(() => {
    if (JSON.stringify(current.current) === encoded) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const start = current.current.length ? current.current : target.map(point => ({ ...point, y: baseline }));
    const end = target.length ? target : start.map(point => ({ ...point, y: baseline }));
    let frame = 0;
    const finish = () => { cancelAnimationFrame(frame); current.current = target; setPoints(target); };
    if (motion.matches || !end.length) { finish(); return; }
    const began = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - began) / duration);
      if (progress === 1) { finish(); return; }
      current.current = morphMusicLine(start, end, ease(progress)); setPoints(current.current);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const changed = () => { if (motion.matches) finish(); };
    motion.addEventListener("change", changed);
    return () => { cancelAnimationFrame(frame); motion.removeEventListener("change", changed); };
  }, [encoded, baseline]);
  return points;
}

export function MusicNumber({ value }: { value: number }) {
  const points = useMusicLineMotion([{ t: 0, x: 0, y: value }], 0);
  const format = (value: number) => number.format(Math.round(value));
  return <><span aria-hidden="true">{format(points[0]?.y ?? value)}</span><span className="sr-only">{format(value)}</span></>;
}

export function useMusicPresence<T extends { key: string }>(items: T[]): MusicPresence<T>[] {
  const encoded = JSON.stringify(items), previous = useRef(encoded);
  const [rows, setRows] = useState<MusicPresence<T>[]>(() => items.map(item => ({ item, phase: "present" })));
  useLayoutEffect(() => {
    if (previous.current === encoded) return;
    previous.current = encoded;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const finish = () => setRows(items.map(item => ({ item, phase: "present" })));
    if (motion.matches) { finish(); return; }
    setRows(old => {
      const existing = new Map(old.map(row => [row.item.key, row]));
      const keys = new Set(items.map(item => item.key));
      return [...items.map(item => ({ item, phase: existing.has(item.key) ? "present" as const : "enter" as const })), ...old.filter(row => !keys.has(row.item.key)).map(row => ({ ...row, phase: "exit" as const }))];
    });
    const timer = setTimeout(finish, duration);
    const changed = () => { if (motion.matches) { clearTimeout(timer); finish(); } };
    motion.addEventListener("change", changed);
    return () => { clearTimeout(timer); motion.removeEventListener("change", changed); };
  }, [encoded]);
  return rows;
}

interface Box { top: number; left: number; width: number }
/** Only changed rows move. The list's own height and entering/leaving items animate independently. */
export function useMusicListMotion<T extends { key: string }>(items: T[]) {
  const encoded = JSON.stringify(items), rows = useMusicPresence(items);
  const root = useRef<HTMLElement | null>(null), nodes = useRef(new Map<string, HTMLElement>());
  const boxes = useRef(new Map<string, Box>()), animations = useRef(new Map<string, Animation>());
  const [height, setHeight] = useState<number | null>(null);
  const setRoot = useCallback((node: HTMLElement | null) => { root.current = node; }, []);
  const bind = (key: string) => (node: HTMLElement | null) => { if (node) nodes.current.set(key, node); else nodes.current.delete(key); };
  // This commit still has the old rows. Capture their actual position before presence applies the update.
  useLayoutEffect(() => {
    if (!root.current) return;
    const origin = root.current.getBoundingClientRect();
    boxes.current = new Map([...nodes.current].map(([key, node]) => { const rect = node.getBoundingClientRect(); return [key, { top: rect.top - origin.top, left: rect.left - origin.left, width: rect.width }]; }));
  }, [encoded]);
  useLayoutEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next = new Map<string, Box>();
    for (const [key, animation] of animations.current) if (!nodes.current.has(key)) { animation.cancel(); animations.current.delete(key); }
    for (const { item, phase } of rows) {
      const node = nodes.current.get(item.key); if (!node) continue;
      const before = boxes.current.get(item.key);
      const after = { top: node.offsetTop, left: node.offsetLeft, width: node.offsetWidth };
      if (phase !== "exit") next.set(item.key, after); else if (before) next.set(item.key, before);
      animations.current.get(item.key)?.cancel();
      if (!reduced && phase === "present" && before && (Math.abs(before.top - after.top) > .5 || Math.abs(before.left - after.left) > .5)) {
        const animation = node.animate([{ transform: `translate(${before.left - after.left}px, ${before.top - after.top}px)` }, { transform: "translate(0, 0)" }], { duration, easing: "cubic-bezier(.22,1,.36,1)" });
        animations.current.set(item.key, animation);
        animation.onfinish = () => { if (animations.current.get(item.key) === animation) animations.current.delete(item.key); };
      }
    }
    boxes.current = next;
  }, [rows]);
  useLayoutEffect(() => {
    if (!root.current) return;
    const measure = () => setHeight(root.current!.getBoundingClientRect().height + 12);
    measure(); const observer = new ResizeObserver(measure); observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const stop = () => { if (motion.matches) for (const animation of animations.current.values()) animation.cancel(); };
    motion.addEventListener("change", stop);
    return () => { motion.removeEventListener("change", stop); for (const animation of animations.current.values()) animation.cancel(); };
  }, []);
  const exitStyle = (key: string): CSSProperties | undefined => { const box = boxes.current.get(key); return box ? { position: "absolute", top: box.top, left: box.left, width: box.width } : undefined; };
  return { rows, bind, setRoot, exitStyle, containerStyle: height === null ? undefined : { height } };
}
