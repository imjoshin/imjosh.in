"use client";

import { useCallback, useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { platformLabels, type MusicSeasonalDataset, type SeasonalMetric, type SeasonalSeries } from "@/lib/music/types";
import { MusicSwap } from "./music-swap";

const number = (value: number) => new Intl.NumberFormat("en-US").format(value);
const metrics: SeasonalMetric[] = ["genres", "artists", "albums"];
const dash = [undefined, "8 4", "2 4", "10 3 2 3"];
const color = (index: number) => { const hue = (264 + index * 137.508) % 360; return `light-dark(hsl(${hue} 64% 39%), hsl(${hue} 64% 72%))`; };
const total = (series: SeasonalSeries) => series.plays.reduce((a, b) => a + b, 0);

export function MusicSeasonChart({ data, loading = false, error = false }: { data: MusicSeasonalDataset | null; loading?: boolean; error?: boolean }) {
  const [metric, setMetric] = useState<SeasonalMetric>("genres");
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null), [hovered, setHovered] = useState<string | null>(null);
  const id = useId();
  const [plotWidth, setPlotWidth] = useState(760);
  const observer = useRef<ResizeObserver | null>(null);
  const measurePlot = useCallback((node: HTMLDivElement | null) => {
    observer.current?.disconnect();
    if (node) { observer.current = new ResizeObserver(([entry]) => setPlotWidth(Math.max(240, Math.round(entry.contentRect.width)))); observer.current.observe(node); }
  }, []);
  useEffect(() => () => observer.current?.disconnect(), []);
  const coordinates = { left: 42, right: plotWidth - 16, top: 24, bottom: 290 };
  const seasons = data?.seasons || [], values = data?.metrics[metric];
  const series = values?.series || [];
  const selectedIndex = Math.max(0, selectedSeason ? seasons.findIndex(s => s.key === selectedSeason) : seasons.length - 1);
  const highlight = pinned || hovered;
  const maximum = Math.max(1, ...series.flatMap(s => s.plays));
  const step = Math.max(1, Math.ceil(maximum / 4 / 10 ** Math.floor(Math.log10(maximum / 4 || 1))) * 10 ** Math.floor(Math.log10(maximum / 4 || 1)));
  const ceiling = Math.ceil(maximum / step) * step;
  const x = (i: number) => seasons.length < 2 ? (coordinates.left + coordinates.right) / 2 : coordinates.left + i / (seasons.length - 1) * (coordinates.right - coordinates.left);
  const y = (plays: number) => coordinates.bottom - plays / ceiling * (coordinates.bottom - coordinates.top);
  const leaders = [...series].filter(s => s.plays[selectedIndex] > 0).sort((a, b) => b.plays[selectedIndex] - a.plays[selectedIndex] || a.key.localeCompare(b.key)).slice(0, 5);
  const legend = [...series].sort((a, b) => total(b) - total(a) || a.key.localeCompare(b.key));
  const highlightedSeries = series.find(s => s.key === highlight);
  function inspect(event: PointerEvent<SVGSVGElement>) {
    if (!seasons.length || event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - bounds.left) / bounds.width * plotWidth;
    const index = Math.max(0, Math.min(seasons.length - 1, Math.round((px - coordinates.left) / (coordinates.right - coordinates.left) * (seasons.length - 1))));
    setSelectedSeason(seasons[index].key);
  }
  return <section className="music-season-panel panel rounded-[28px] p-5 sm:p-8" aria-labelledby={`${id}-heading`} aria-busy={loading}>
    <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="music-label">Every season has its favorites</p><h2 id={`${id}-heading`} className="mt-2 font-display text-[clamp(36px,4vw,48px)] leading-none">The changing <em className="text-accent">soundtrack.</em></h2></div><div className="music-tabs" role="group" aria-label="Seasonal chart metric">{metrics.map(value => <button key={value} aria-pressed={metric === value} onClick={() => { setMetric(value); setPinned(null); setHovered(null); }} className="capitalize">{value}</button>)}</div></div>
    <p className="mt-4 max-w-[80ch] text-[14px] leading-relaxed text-muted">All time, one season at a time. Every {metric === "genres" ? "genre" : metric === "artists" ? "artist" : "album"} that made a season’s top five gets a line across the whole collection.</p>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted"><span>{loading ? "Updating seasonal history…" : error ? "Seasonal history is unavailable. Try another platform or reload." : `${number(series.length)} lines · Plays per season · ${data && data.platform !== "all" ? platformLabels[data.platform] : "All platforms"}`}</span></div>
    <MusicSwap identity={`${data?.platform}:${data?.generatedAt}:${metric}`}>
      {series.length ? <>
        <div className="music-season-layout mt-5">
          <div className="min-w-0" ref={measurePlot}><p className="music-label mb-2">Recorded plays</p><svg viewBox={`0 0 ${plotWidth} 350`} className="music-season-svg w-full" role="img" aria-labelledby={`${id}-chart-title ${id}-chart-description`} onPointerMove={inspect}>
            <title id={`${id}-chart-title`}>{`Seasonal top ${metric}, all time`}</title><desc id={`${id}-chart-description`}>{`${series.length} series, selected from each season's top five. The y axis is recorded plays in that season. Use the season selector, legend buttons, or data table to inspect counts.`}</desc>
            {Array.from({ length: Math.round(ceiling / step) + 1 }, (_, i) => i * step).map(value => <g key={value}><line x1={coordinates.left} x2={coordinates.right} y1={y(value)} y2={y(value)} stroke="var(--line)" strokeDasharray="3 6" /><text x="30" y={y(value) + 4} textAnchor="end" fill="var(--mute)" fontSize="13">{number(value)}</text></g>)}
            {seasons.map((season, i) => <g key={season.key}>{(i % Math.max(1, Math.ceil(seasons.length / Math.max(2, Math.floor(plotWidth / 120)))) === 0 || i === seasons.length - 1) && <text x={x(i)} y="319" textAnchor={i === 0 && seasons.length > 1 ? "start" : i === seasons.length - 1 && seasons.length > 1 ? "end" : "middle"} fill="var(--mute)" fontSize="13">{season.label.split(" ")[0]}<tspan x={x(i)} dy="17">{season.label.split(" ")[1]}</tspan></text>}</g>)}
            <line x1={x(selectedIndex)} x2={x(selectedIndex)} y1={coordinates.top} y2={coordinates.bottom} stroke="var(--ink)" opacity=".25" />
            {series.map((line, i) => <g key={line.key} className="music-season-line" style={{ opacity: highlight && highlight !== line.key ? .13 : 1 }} onPointerEnter={() => setHovered(line.key)} onPointerLeave={() => setHovered(null)}>
              <path className="music-season-path" d={line.plays.map((value, j) => `${j ? "L" : "M"} ${x(j)} ${y(value)}`).join(" ")} stroke={color(i)} strokeWidth={highlight === line.key ? 3.5 : 2} strokeDasharray={dash[i % dash.length]} strokeLinecap="round" strokeLinejoin="round" fill="none"><title>{line.name}</title></path>
              <circle cx={x(selectedIndex)} cy={y(line.plays[selectedIndex] || 0)} r={highlight === line.key ? 5 : 3} fill={color(i)} stroke="var(--bg)" strokeWidth="1.5"><title>{`${line.name}, ${seasons[selectedIndex]?.label}: ${number(line.plays[selectedIndex] || 0)} plays`}</title></circle>
            </g>)}
          </svg></div>
          <aside className="music-season-inspector"><label className="music-select-label">Inspect season<select className="music-select w-full" value={seasons[selectedIndex]?.key || ""} onChange={event => setSelectedSeason(event.target.value)}>{seasons.map(season => <option key={season.key} value={season.key}>{season.label}</option>)}</select></label>
            <p className="music-label mt-5">{highlightedSeries ? "Highlighted" : "This season’s top five"}</p>
            {highlightedSeries ? <div className="mt-3"><p className="break-words font-medium">{highlightedSeries.name}</p><p className="mt-1 text-[13px] text-muted">{highlightedSeries.artists.join(", ")}</p><p className="mt-3 font-display text-[40px] leading-none">{number(highlightedSeries.plays[selectedIndex] || 0)} <span className="font-sans text-[13px] text-muted">plays</span></p><button className="mt-4 text-[13px] text-accent underline underline-offset-4" onClick={() => { setPinned(null); setHovered(null); }}>Show all lines</button></div> : leaders.length ? <ol className="mt-3 space-y-3">{leaders.map(line => <li key={line.key} className="flex items-start gap-2 text-[13px]"><span className="music-series-dot mt-1" style={{ background: color(series.indexOf(line)) }} /><span className="min-w-0 flex-1 break-words">{line.name}{line.artists.length > 0 && <span className="mt-0.5 block text-muted">{line.artists.join(", ")}</span>}</span><span className="tabular-nums text-muted">{number(line.plays[selectedIndex])}</span></li>)}</ol> : <p className="mt-3 text-[14px] leading-relaxed text-muted">No entries for this season.</p>}
          </aside>
        </div>
        <div className="mt-5 flex items-center justify-between gap-3 text-[13px] text-muted"><p>Choose a line to highlight it. All {series.length} are shown by default.</p>{pinned && <button className="shrink-0 text-accent underline underline-offset-4" onClick={() => setPinned(null)}>Show all</button>}</div>
        <div className="music-season-legend mt-3" role="group" aria-label={`${metric} chart legend`}>{legend.map(line => { const index = series.indexOf(line); return <button key={line.key} aria-pressed={pinned === line.key} title={[line.name, ...line.artists].join(" · ")} onClick={() => setPinned(pinned === line.key ? null : line.key)} onPointerEnter={() => setHovered(line.key)} onPointerLeave={() => setHovered(null)} onFocus={() => setHovered(line.key)} onBlur={() => setHovered(null)}><svg width="24" height="8" viewBox="0 0 24 8" aria-hidden="true" className="shrink-0"><line x1="0" x2="24" y1="4" y2="4" stroke={color(index)} strokeWidth="2.5" strokeDasharray={dash[index % dash.length]} /></svg><span className="truncate">{line.name}{line.artists.length > 0 && <span className="text-muted"> · {line.artists.join(", ")}</span>}</span></button>; })}</div>
        <details className="mt-5 text-[13px] text-muted"><summary className="w-fit cursor-pointer">View seasonal counts</summary><div className="mt-3 max-h-80 overflow-auto rounded-xl border border-line" tabIndex={0} role="region" aria-label={`${metric} seasonal counts`}><table className="music-season-table"><caption className="sr-only">Recorded plays for every displayed {metric === "genres" ? "genre" : metric === "artists" ? "artist" : "album"}, by season.</caption><thead><tr><th scope="col">{metric === "genres" ? "Genre" : metric === "artists" ? "Artist" : "Album"}</th>{seasons.map(s => <th key={s.key} scope="col">{s.label}</th>)}</tr></thead><tbody>{legend.map(line => <tr key={line.key}><th scope="row">{line.name}{line.artists.length > 0 && <span className="block font-normal">{line.artists.join(", ")}</span>}</th>{line.plays.map((value, i) => <td key={seasons[i].key}>{number(value)}</td>)}</tr>)}</tbody></table></div></details>
      </> : <div className="music-season-empty mt-6 flex min-h-64 flex-col items-center justify-center rounded-[20px] border border-dashed border-line p-6 text-center"><p className="font-display text-[32px]">{loading ? "Finding the soundtrack…" : `More ${metric === "genres" ? "genre" : metric === "artists" ? "artist" : "album"} details to come.`}</p><p className="mt-3 max-w-[46ch] text-[14px] leading-relaxed text-muted">The chart will grow as listening history arrives.</p></div>}
    </MusicSwap>
  </section>;
}
