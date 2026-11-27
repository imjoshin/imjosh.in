"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { MusicEntityRef } from "@/lib/music/types";
import { MusicArtists, MusicLink } from "./music-entity-link";

const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export interface ChartTooltipRow { key: string; label: string; value: number; detail?: string; color?: string; entity?: MusicEntityRef; artists?: string[]; onSelect?: () => void }
type TooltipSide = "top" | "bottom" | "left" | "right";

export function MusicChartTooltip({ id, title, rows, x = 50, placement = "top", preferTop = false, secondary, onCardClose }: { id: string; title: string; rows: ChartTooltipRow[]; x?: number; placement?: "top" | "bottom"; preferTop?: boolean; secondary?: string; onCardClose?: () => void }) {
  const limit = rows.some(row => row.detail) ? 4 : 6;
  const linked = rows.some(row => row.entity || row.onSelect);
  const popup = useRef<HTMLDivElement>(null), content = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0, maxHeight: 0, side: "top" as TooltipSide, ready: false });
  useLayoutEffect(() => {
    const element = popup.current, body = content.current, chart = element?.parentElement;
    if (!element || !body || !chart) return;
    const reposition = () => {
      const bounds = chart.getBoundingClientRect(), box = element.getBoundingClientRect();
      const viewport = window.visualViewport;
      const offsetX = viewport?.offsetLeft || 0, offsetY = viewport?.offsetTop || 0;
      const leftEdge = offsetX + 12, rightEdge = offsetX + (viewport?.width || innerWidth) - 12;
      const bottomEdge = offsetY + (viewport?.height || innerHeight) - 12;
      const header = document.querySelector(".site-header")?.getBoundingClientRect();
      const filters = document.querySelector('.music-history-filters[data-stuck="true"]')?.getBoundingClientRect();
      const covered = Math.max(offsetY, header?.bottom || 0, filters && filters.top < bottomEdge && filters.bottom > offsetY ? filters.bottom : 0);
      const topEdge = Math.min(bottomEdge - 1, covered + 12);
      const gap = 12, width = box.width, naturalHeight = body.scrollHeight + 2;
      let maxHeight = Math.max(1, bottomEdge - topEdge);
      let side: TooltipSide;
      // Top-first charts only fall below when the card cannot fit above the plot.
      if (!preferTop && x < 50 && bounds.left - gap - width >= leftEdge) side = "left";
      else if (!preferTop && bounds.right + gap + width <= rightEdge) side = "right";
      else if (!preferTop && bounds.left - gap - width >= leftEdge) side = "left";
      else {
        const above = bounds.top - gap - topEdge, below = bottomEdge - bounds.bottom - gap;
        side = preferTop ? above >= naturalHeight ? "top" : "bottom" : placement === "top" && above >= naturalHeight ? "top" : placement === "bottom" && below >= naturalHeight ? "bottom" : above >= below ? "top" : "bottom";
        maxHeight = Math.min(maxHeight, Math.max(120, side === "top" ? above : below));
      }
      const height = Math.min(naturalHeight, maxHeight);
      const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
      const left = clamp(side === "left" ? bounds.left - gap - width : side === "right" ? bounds.right + gap : bounds.left + bounds.width * x / 100 - width / 2, leftEdge, rightEdge - width);
      const top = clamp(side === "top" ? bounds.top - gap - height : side === "bottom" ? bounds.bottom + gap : bounds.top + bounds.height / 2 - height / 2, topEdge, bottomEdge - height);
      const next = { left: left - bounds.left, top: top - bounds.top, maxHeight, side, ready: true };
      setPosition(old => old.left === next.left && old.top === next.top && old.maxHeight === next.maxHeight && old.side === next.side && old.ready ? old : next);
    };
    reposition();
    const observer = new ResizeObserver(reposition); observer.observe(body); observer.observe(chart);
    addEventListener("scroll", reposition, true); addEventListener("resize", reposition);
    window.visualViewport?.addEventListener("resize", reposition); window.visualViewport?.addEventListener("scroll", reposition);
    return () => { observer.disconnect(); removeEventListener("scroll", reposition, true); removeEventListener("resize", reposition); window.visualViewport?.removeEventListener("resize", reposition); window.visualViewport?.removeEventListener("scroll", reposition); };
  }, [x, placement, preferTop, title, secondary, rows]);
  return <div ref={popup} id={id} role={linked ? "group" : "tooltip"} aria-label={linked ? `${title} listening details` : undefined} aria-live="polite" aria-atomic="true" className="music-chart-tooltip" data-linked={linked || undefined} data-ready={position.ready || undefined} data-side={position.side} data-many={rows.length > 1 || undefined} style={{ left: position.left, top: position.top, "--chart-tooltip-max-height": `${position.maxHeight}px` } as CSSProperties}>
    <div ref={content} className="music-chart-tooltip-content">
    <p className="mb-2 text-[13px] font-medium text-accent">{title}</p>
    {rows.length ? <ul className="space-y-2">{rows.slice(0, limit).map(row => <li key={row.key} className="flex items-start gap-2 text-[13px]">
      {row.color && <span className="music-series-dot mt-1" style={{ background: row.color }} />}
      <span className="min-w-0 flex-1 break-words"><span className="music-tooltip-label">{row.entity ? <MusicLink entity={row.entity} onCardClose={onCardClose}>{row.label}</MusicLink> : row.onSelect ? <button type="button" className="text-left hover:text-accent" onClick={row.onSelect}>{row.label}</button> : row.label}</span>{row.detail && <span className="mt-0.5 block truncate text-[12px] text-muted">{row.artists ? <MusicArtists names={row.artists} onCardClose={onCardClose} /> : row.detail}</span>}{row.entity && row.onSelect && <button type="button" className="mt-1 block text-accent underline underline-offset-2" aria-label={`Show songs for ${row.label}`} onClick={row.onSelect}>View songs</button>}</span>
      <span className="shrink-0 whitespace-nowrap font-medium tabular-nums">{number.format(row.value)} <span className="font-normal text-muted">{row.value === 1 ? "play" : "plays"}</span></span>
    </li>)}</ul> : <p className="text-[13px] text-muted">No entries for this season.</p>}
    {rows.length > limit && <p className="mt-2 text-[12px] text-muted">{limit} of {rows.length} series. Choose a legend entry for details.</p>}
    {secondary && <p className="mt-2 text-[12px] text-muted">{secondary}</p>}
    </div>
  </div>;
}
