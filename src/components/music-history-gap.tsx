"use client";

import { useId } from "react";
import { googlePlayMusicGap, type MusicHistoryGapRange } from "@/lib/music/history-gap";

export function MusicHistoryGapNotice() {
  return <div className="music-gap-notice"><p className="font-medium text-ink">Missing Google Play Music history</p><p className="mt-1">{googlePlayMusicGap.label}</p><p className="mt-2 leading-relaxed">{googlePlayMusicGap.description}</p></div>;
}

/** Decorative only: chart pointer/tap inspection and song selection keep working. */
export function MusicHistoryGapBand({ range, left, right, top, bottom, active }: { range: MusicHistoryGapRange | null; left: number; right: number; top: number; bottom: number; active: boolean }) {
  const id = useId().replaceAll(":", "");
  if (!range) return null;
  const start = left + range.start * (right - left), end = left + range.end * (right - left);
  return <g className="music-history-gap" data-active={active || undefined} aria-hidden="true" pointerEvents="none">
    <defs><pattern id={id} width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 5 0 V 10" className="music-gap-hatch" /></pattern></defs>
    <rect x={start} y={top} width={end - start} height={bottom - top} className="music-gap-fill" />
    <rect x={start} y={top} width={end - start} height={bottom - top} fill={`url(#${id})`} />
    {[range.startsHere ? start : null, range.endsHere ? end : null].map((x, i) => x !== null && <line key={i} x1={x} x2={x} y1={top} y2={bottom} className="music-gap-boundary" vectorEffect="non-scaling-stroke" />)}
  </g>;
}
