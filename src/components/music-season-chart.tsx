"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { type MusicSeasonalDataset, type SeasonalMetric, type SeasonalSeries } from "@/lib/music/types";
import { MusicChartTooltip } from "./music-chart-tooltip";
import { chartPointAt, nearestChartIndex, type MusicChartPoint } from "@/lib/music/chart-interaction";
import { MusicNumber, useMusicLineMotion, useMusicPresence } from "./music-motion";
import { isMusicCardTarget, MusicArtists, MusicLink } from "./music-entity-link";

const number = (value: number) => new Intl.NumberFormat("en-US").format(value);
const metrics: SeasonalMetric[] = ["genres", "artists", "albums"];
const dash = [undefined, "8 4", "2 4", "10 3 2 3"];
const color = (index: number) => { const hue = (264 + index * 137.508) % 360; return `light-dark(hsl(${hue} 64% 39%), hsl(${hue} 64% 72%))`; };
const total = (series: SeasonalSeries) => series.plays.reduce((a, b) => a + b, 0);
const seasonTime = (key: string) => { const [year, name] = key.split("-"); return Number(year) * 4 + ["winter", "spring", "summer", "fall"].indexOf(name); };
function SeasonName({ line, metric }: { line: SeasonalSeries; metric: SeasonalMetric }) {
  return metric === "genres" ? line.name : <MusicLink entity={{ kind: metric === "artists" ? "artist" : "album", name: line.name, artists: line.artists, url: line.url }}>{line.name}</MusicLink>;
}
interface PlotSeries { key: string; source: SeasonalSeries; points: MusicChartPoint[]; index: number }
function SeasonLine({ item, phase, selectedTime, highlighted, dimmed, frames }: { item: PlotSeries; phase: "present" | "enter" | "exit"; selectedTime: number; highlighted: boolean; dimmed: boolean; frames: Map<string, MusicChartPoint[]> }) {
  const points = useMusicLineMotion(phase === "exit" ? [] : item.points, 290, phase === "enter");
  useLayoutEffect(() => { frames.set(item.key, points); return () => { frames.delete(item.key); }; }, [frames, item.key, points]);
  const selected = chartPointAt(points, selectedTime);
  return <g className="music-series-presence" data-phase={phase} aria-hidden={phase === "exit" || undefined}><g className="music-season-line" style={{ opacity: dimmed ? .13 : 1 }}>
    <path className="music-season-path" d={points.map((point, i) => `${i ? "L" : "M"} ${point.x} ${point.y}`).join(" ")} stroke={color(item.index)} strokeWidth={highlighted ? 3.5 : 2} strokeDasharray={dash[item.index % dash.length]} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    {points.length > 0 && <circle cx={selected.x} cy={selected.y} r={highlighted ? 5 : 3} fill={color(item.index)} stroke="var(--bg)" strokeWidth="1.5" />}
  </g></g>;
}

export function MusicSeasonChart({ data, loading = false, error = false }: { data: MusicSeasonalDataset | null; loading?: boolean; error?: boolean }) {
  const [metric, setMetric] = useState<SeasonalMetric>("genres");
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null), [hovered, setHovered] = useState<string | null>(null);
  const [inspection, setInspection] = useState<{ keys: string[]; x: number; placement: "top" | "bottom" } | null>(null);
  useEffect(() => setInspection(null), [data?.platform]);
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
  const highlightKeys = (pinned ? [pinned] : hovered ? [hovered] : inspection?.keys || []).filter(key => series.some(line => line.key === key));
  const maximum = Math.max(1, ...series.flatMap(s => s.plays));
  const step = Math.max(1, Math.ceil(maximum / 4 / 10 ** Math.floor(Math.log10(maximum / 4 || 1))) * 10 ** Math.floor(Math.log10(maximum / 4 || 1)));
  const ceiling = Math.ceil(maximum / step) * step;
  const x = (i: number) => seasons.length < 2 ? (coordinates.left + coordinates.right) / 2 : coordinates.left + i / (seasons.length - 1) * (coordinates.right - coordinates.left);
  const y = (plays: number) => coordinates.bottom - plays / ceiling * (coordinates.bottom - coordinates.top);
  const plotted = useMusicPresence(series.map((source, index) => ({ key: `${metric}:${source.key}`, source, index, points: source.plays.map((plays, i) => ({ t: seasonTime(seasons[i].key), x: x(i), y: y(plays) })) })));
  const frames = useRef(new Map<string, MusicChartPoint[]>());
  const leaders = [...series].filter(s => s.plays[selectedIndex] > 0).sort((a, b) => b.plays[selectedIndex] - a.plays[selectedIndex] || a.key.localeCompare(b.key)).slice(0, 5);
  const legend = [...series].sort((a, b) => total(b) - total(a) || a.key.localeCompare(b.key));
  const highlightedSeries = highlightKeys.length === 1 ? series.find(s => s.key === highlightKeys[0]) : undefined;
  const tooltipSeries = highlightKeys.length ? series.filter(line => highlightKeys.includes(line.key)) : leaders;
  function inspect(event: PointerEvent<SVGSVGElement>) {
    if (!seasons.length) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - bounds.left) / bounds.width * plotWidth;
    const py = (event.clientY - bounds.top) / bounds.height * 350;
    if (px < coordinates.left - 8 || px > coordinates.right + 8 || py < coordinates.top - 8 || py > coordinates.bottom + 8) { setInspection(null); return; }
    const index = nearestChartIndex((px - coordinates.left) / (coordinates.right - coordinates.left), seasons.length);
    const distances = series.filter(line => line.plays[index] > 0).map(line => ({ line, distance: Math.abs((frames.current.get(`${metric}:${line.key}`) ? chartPointAt(frames.current.get(`${metric}:${line.key}`)!, seasonTime(seasons[index].key)).y : y(line.plays[index])) - py) }));
    const nearest = Math.min(...distances.map(item => item.distance));
    const matches = nearest <= 16 ? distances.filter(item => Math.abs(item.distance - nearest) < 1e-9).map(item => item.line) : [];
    setSelectedSeason(seasons[index].key);
    setHovered(null);
    setInspection({ keys: matches.map(line => line.key), x: x(index) / plotWidth * 100, placement: py < 175 ? "bottom" : "top" });
  }
  function explore(event: KeyboardEvent<HTMLDivElement>) {
    if (!seasons.length) return;
    const next = event.key === "ArrowLeft" ? Math.max(0, selectedIndex - 1) : event.key === "ArrowRight" ? Math.min(seasons.length - 1, selectedIndex + 1) : event.key === "Home" ? 0 : event.key === "End" ? seasons.length - 1 : undefined;
    if (next !== undefined) { event.preventDefault(); setSelectedSeason(seasons[next].key); setInspection({ keys: [], x: x(next) / plotWidth * 100, placement: "top" }); }
    else if ((event.key === "ArrowUp" || event.key === "ArrowDown") && series.length) {
      event.preventDefault(); const current = series.findIndex(line => line.key === highlightKeys[0]);
      const index = current < 0 ? event.key === "ArrowDown" ? 0 : series.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + series.length) % series.length;
      setPinned(series[index].key); setInspection({ keys: [], x: x(selectedIndex) / plotWidth * 100, placement: "top" });
    } else if (event.key === "Escape") { event.preventDefault(); setInspection(null); setPinned(null); setHovered(null); }
  }
  return <section className="music-season-panel panel rounded-[28px] p-5 sm:p-8" aria-labelledby={`${id}-heading`} aria-busy={loading}>
    <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="music-label">Every season has its favorites</p><h2 id={`${id}-heading`} className="mt-2 font-display text-[clamp(36px,4vw,48px)] leading-none">The changing <em className="text-accent">soundtrack.</em></h2></div><div className="music-tabs" role="group" aria-label="Seasonal chart metric">{metrics.map(value => <button key={value} aria-pressed={metric === value} onClick={() => { setMetric(value); setPinned(null); setHovered(null); setInspection(null); }} className="capitalize">{value}</button>)}</div></div>
    <p className="mt-4 max-w-[80ch] text-[14px] leading-relaxed text-muted">All time, one season at a time. Every {metric === "genres" ? "genre" : metric === "artists" ? "artist" : "album"} that made a season’s top five gets a line across the whole collection.</p>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted"><span>{loading ? "Updating seasonal history…" : error ? "Seasonal history is unavailable. Try reloading." : `${number(series.length)} lines · Plays per season`}</span></div>
      <div hidden={!seasons.length}>
        <div className="music-season-layout mt-5">
          <div className="min-w-0" ref={measurePlot}><p className="music-label mb-2">Recorded plays</p><div className="music-chart-surface" role="group" tabIndex={0} aria-label="Seasonal listening chart" aria-describedby={`${id}-chart-help${inspection ? ` ${id}-tooltip` : ""}`} onKeyDown={explore} onFocus={() => { if (seasons.length) setInspection(value => value ?? { keys: [], x: x(selectedIndex) / plotWidth * 100, placement: "top" }); }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget) && !isMusicCardTarget(event.relatedTarget)) setInspection(null); }} onPointerLeave={event => { if (event.pointerType !== "touch" && !event.currentTarget.contains(document.activeElement) && !isMusicCardTarget(event.relatedTarget)) setInspection(null); }}>
            <p id={`${id}-chart-help`} className="sr-only">Use Left and Right to explore seasons, Up and Down to highlight lines, Home and End to jump, and Escape to dismiss details.</p>
            <svg viewBox={`0 0 ${plotWidth} 350`} className="music-season-svg w-full" role="img" aria-labelledby={`${id}-chart-title ${id}-chart-description`} onPointerMove={event => { if (event.pointerType !== "touch") inspect(event); }} onPointerDown={inspect}>
            <title id={`${id}-chart-title`}>{`Seasonal top ${metric}, all time`}</title><desc id={`${id}-chart-description`}>{`${series.length} series, selected from each season's top five. The y axis is recorded plays in that season. Use the season selector, legend buttons, or data table to inspect counts.`}</desc>
            {Array.from({ length: Math.round(ceiling / step) + 1 }, (_, i) => i * step).map(value => <g key={value}><line x1={coordinates.left} x2={coordinates.right} y1={y(value)} y2={y(value)} stroke="var(--line)" strokeDasharray="3 6" /><text x="30" y={y(value) + 4} textAnchor="end" fill="var(--mute)" fontSize="13">{number(value)}</text></g>)}
            {seasons.map((season, i) => <g key={season.key}>{(i % Math.max(1, Math.ceil(seasons.length / Math.max(2, Math.floor(plotWidth / 120)))) === 0 || i === seasons.length - 1) && <text x={x(i)} y="319" textAnchor={i === 0 && seasons.length > 1 ? "start" : i === seasons.length - 1 && seasons.length > 1 ? "end" : "middle"} fill="var(--mute)" fontSize="13">{season.label.split(" ")[0]}<tspan x={x(i)} dy="17">{season.label.split(" ")[1]}</tspan></text>}</g>)}
            <line x1={x(selectedIndex)} x2={x(selectedIndex)} y1={coordinates.top} y2={coordinates.bottom} stroke="var(--ink)" opacity=".25" />
            {plotted.map(({ item, phase }) => <SeasonLine key={item.key} item={item} phase={phase} selectedTime={seasons[selectedIndex] ? seasonTime(seasons[selectedIndex].key) : 0} highlighted={highlightKeys.includes(item.source.key)} dimmed={highlightKeys.length > 0 && !highlightKeys.includes(item.source.key)} frames={frames.current} />)}
          </svg>
            {inspection && <MusicChartTooltip id={`${id}-tooltip`} title={seasons[selectedIndex]?.label || ""} x={inspection.x} placement={inspection.placement} onCardClose={() => setInspection(null)} rows={tooltipSeries.map(line => ({ key: line.key, label: line.name, entity: metric === "genres" ? undefined : { kind: metric === "artists" ? "artist" : "album", name: line.name, artists: line.artists, url: line.url }, artists: line.artists, detail: line.artists.join(", "), value: line.plays[selectedIndex] || 0, color: color(series.indexOf(line)) }))} />}
          </div></div>
          <aside className="music-season-inspector"><label className="music-select-label">Inspect season<select className="music-select w-full" value={seasons[selectedIndex]?.key || ""} onChange={event => { setSelectedSeason(event.target.value); setInspection(null); setHovered(null); }}>{seasons.map(season => <option key={season.key} value={season.key}>{season.label}</option>)}</select></label>
            <p className="music-label mt-5">{highlightedSeries ? "Highlighted" : "This season’s top five"}</p>
            {highlightedSeries ? <div className="mt-3"><p className="break-words font-medium"><SeasonName line={highlightedSeries} metric={metric} /></p><p className="mt-1 text-[13px] text-muted"><MusicArtists names={highlightedSeries.artists} /></p><p className="mt-3 font-display text-[40px] leading-none"><MusicNumber value={highlightedSeries.plays[selectedIndex] || 0} /> <span className="font-sans text-[13px] text-muted">plays</span></p><button className="mt-4 text-[13px] text-accent underline underline-offset-4" onClick={() => { setPinned(null); setHovered(null); }}>Show all lines</button></div> : leaders.length ? <ol className="mt-3 space-y-3">{leaders.map(line => <li key={line.key} className="flex items-start gap-2 text-[13px]"><span className="music-series-dot mt-1" style={{ background: color(series.indexOf(line)) }} /><span className="min-w-0 flex-1 break-words"><SeasonName line={line} metric={metric} />{line.artists.length > 0 && <span className="mt-0.5 block text-muted"><MusicArtists names={line.artists} /></span>}</span><span className="tabular-nums text-muted"><MusicNumber value={line.plays[selectedIndex]} /></span></li>)}</ol> : <p className="mt-3 text-[14px] leading-relaxed text-muted">No entries for this season.</p>}
          </aside>
        </div>
        <div className="mt-5 flex items-center justify-between gap-3 text-[13px] text-muted"><p>Choose a line to highlight it. All {series.length} are shown by default.</p>{pinned && <button className="shrink-0 text-accent underline underline-offset-4" onClick={() => setPinned(null)}>Show all</button>}</div>
        <div className="music-season-legend mt-3" role="group" aria-label={`${metric} chart legend`}>{legend.map(line => { const index = series.indexOf(line); const swatch = <svg width="24" height="8" viewBox="0 0 24 8" aria-hidden="true" className="shrink-0"><line x1="0" x2="24" y1="4" y2="4" stroke={color(index)} strokeWidth="2.5" strokeDasharray={dash[index % dash.length]} /></svg>; const count = <span className="shrink-0 tabular-nums text-muted"><MusicNumber value={line.plays[selectedIndex] || 0} /><span className="sr-only"> plays</span></span>; return <div key={line.key} className="music-season-chip" data-highlighted={pinned === line.key || undefined} onPointerEnter={() => setHovered(line.key)} onPointerLeave={() => setHovered(null)} onFocus={() => setHovered(line.key)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setHovered(null); }}>
          {metric === "genres" ? <button className="flex min-h-9 items-center gap-2" aria-pressed={pinned === line.key} onClick={() => setPinned(pinned === line.key ? null : line.key)}>{swatch}<span>{line.name}</span>{count}</button> : <><button className="music-season-toggle" aria-label={`Highlight ${line.name}`} aria-pressed={pinned === line.key} onClick={() => setPinned(pinned === line.key ? null : line.key)}>{swatch}</button><span className="min-w-0 truncate"><SeasonName line={line} metric={metric} />{line.artists.length > 0 && <span className="text-muted"> · <MusicArtists names={line.artists} /></span>}</span>{count}</>}
        </div>; })}</div>
        <details className="mt-5 text-[13px] text-muted"><summary className="w-fit cursor-pointer">View seasonal counts</summary><div className="mt-3 max-h-80 overflow-auto rounded-xl border border-line" tabIndex={0} role="region" aria-label={`${metric} seasonal counts`}><table className="music-season-table"><caption className="sr-only">Recorded plays for every displayed {metric === "genres" ? "genre" : metric === "artists" ? "artist" : "album"}, by season.</caption><thead><tr><th scope="col">{metric === "genres" ? "Genre" : metric === "artists" ? "Artist" : "Album"}</th>{seasons.map(s => <th key={s.key} scope="col">{s.label}</th>)}</tr></thead><tbody>{legend.map(line => <tr key={line.key}><th scope="row"><SeasonName line={line} metric={metric} />{line.artists.length > 0 && <span className="block font-normal"><MusicArtists names={line.artists} /></span>}</th>{line.plays.map((value, i) => <td key={seasons[i].key}><MusicNumber value={value} /></td>)}</tr>)}</tbody></table></div></details>
      </div>
      {!seasons.length && <div className="music-season-empty mt-6 flex min-h-64 flex-col items-center justify-center rounded-[20px] border border-dashed border-line p-6 text-center"><p className="font-display text-[32px]">{loading ? "Finding the soundtrack…" : `More ${metric === "genres" ? "genre" : metric === "artists" ? "artist" : "album"} details to come.`}</p><p className="mt-3 max-w-[46ch] text-[14px] leading-relaxed text-muted">The chart will grow as listening history arrives.</p></div>}
  </section>;
}
