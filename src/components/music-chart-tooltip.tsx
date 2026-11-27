import type { CSSProperties } from "react";
import type { MusicEntityRef } from "@/lib/music/types";
import { MusicArtists, MusicLink } from "./music-entity-link";

const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export interface ChartTooltipRow { key: string; label: string; value: number; detail?: string; color?: string; entity?: MusicEntityRef; artists?: string[]; onSelect?: () => void }

export function MusicChartTooltip({ id, title, rows, x = 50, placement = "top", secondary, onCardClose }: { id: string; title: string; rows: ChartTooltipRow[]; x?: number; placement?: "top" | "bottom"; secondary?: string; onCardClose?: () => void }) {
  const limit = rows.some(row => row.detail) ? 4 : 6;
  const linked = rows.some(row => row.entity || row.onSelect);
  return <div id={id} role={linked ? "group" : "tooltip"} aria-label={linked ? `${title} listening details` : undefined} aria-live="polite" aria-atomic="true" className="music-chart-tooltip" data-linked={linked || undefined} data-placement={placement} data-many={rows.length > 1 || undefined} style={{ "--chart-tooltip-x": `${x}%` } as CSSProperties}>
    <p className="mb-2 text-[13px] font-medium text-accent">{title}</p>
    {rows.length ? <ul className="space-y-2">{rows.slice(0, limit).map(row => <li key={row.key} className="flex items-start gap-2 text-[13px]">
      {row.color && <span className="music-series-dot mt-1" style={{ background: row.color }} />}
      <span className="min-w-0 flex-1 break-words"><span className="music-tooltip-label">{row.onSelect ? <button type="button" className="text-left hover:text-accent" onClick={row.onSelect}>{row.label}</button> : row.entity ? <MusicLink entity={row.entity} onCardClose={onCardClose}>{row.label}</MusicLink> : row.label}</span>{row.detail && <span className="mt-0.5 block truncate text-[12px] text-muted">{row.artists ? <MusicArtists names={row.artists} onCardClose={onCardClose} /> : row.detail}</span>}</span>
      <span className="shrink-0 whitespace-nowrap font-medium tabular-nums">{number.format(row.value)} <span className="font-normal text-muted">{row.value === 1 ? "play" : "plays"}</span></span>
    </li>)}</ul> : <p className="text-[13px] text-muted">No entries for this season.</p>}
    {rows.length > limit && <p className="mt-2 text-[12px] text-muted">{limit} of {rows.length} series. Choose a legend entry for details.</p>}
    {secondary && <p className="mt-2 text-[12px] text-muted">{secondary}</p>}
  </div>;
}
