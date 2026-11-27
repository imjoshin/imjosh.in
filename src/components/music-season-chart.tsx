"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { type MusicSeasonalDataset, type SeasonalMetric, type SeasonalSeries } from "@/lib/music/types";
import { MusicChartTooltip } from "./music-chart-tooltip";
import { chartPointAt, nearestChartIndex, type MusicChartPoint } from "@/lib/music/chart-interaction";
import { MusicNumber, useMusicLineMotion, useMusicPresence } from "./music-motion";
import { isMusicCardTarget } from "./music-entity-link";
import { useMusicChartInteraction } from "./use-music-chart-interaction";
import { MusicSeasonSongs, type SongSelection } from "./music-season-songs";

const number = (value: number) => new Intl.NumberFormat("en-US").format(value);
const metrics: SeasonalMetric[] = ["genres", "artists", "albums"];
const dash = [undefined, "8 4", "2 4", "10 3 2 3"];
const color = (index: number) => { const hue = (264 + index * 137.508) % 360; return "light-dark(hsl(" + hue + " 64% 39%), hsl(" + hue + " 64% 72%))"; };
const total = (series: SeasonalSeries) => series.plays.reduce((a, b) => a + b, 0);
const seasonTime = (key: string) => { const [year, name] = key.split("-"); return Number(year) * 4 + ["winter", "spring", "summer", "fall"].indexOf(name); };
interface PlotSeries { key: string; source: SeasonalSeries; points: MusicChartPoint[]; index: number; qualifying: Set<number> }
interface Inspection { keys: string[]; x: number; placement: "top" | "bottom" }
interface PointInput { clientX: number; clientY: number; target: EventTarget | null }

function SeasonLine({ item, phase, selectedTime, highlighted, dimmed, frames }: { item: PlotSeries; phase: "present" | "enter" | "exit"; selectedTime: number; highlighted: boolean; dimmed: boolean; frames: Map<string, MusicChartPoint[]> }) {
  const points = useMusicLineMotion(phase === "exit" ? [] : item.points, 290, phase === "enter");
  useLayoutEffect(() => { frames.set(item.key, points); return () => { frames.delete(item.key); }; }, [frames, item.key, points]);
  let pen = false;
  const path = points.map(point => {
    if (!item.qualifying.has(point.t)) { pen = false; return ""; }
    const command = pen ? "L " : "M "; pen = true;
    return command + point.x + " " + point.y;
  }).join(" ");
  const isolated = points.filter(point => item.qualifying.has(point.t) && !item.qualifying.has(point.t - 1) && !item.qualifying.has(point.t + 1));
  const selected = chartPointAt(points, selectedTime);
  return <g className="music-series-presence" data-phase={phase} aria-hidden={phase === "exit" || undefined} pointerEvents={phase === "exit" ? "none" : undefined}>
    <g className="music-season-line" data-key={item.source.key} style={{ opacity: dimmed ? .13 : 1 }}>
      <path className="music-season-path cursor-pointer" d={path} stroke={color(item.index)} strokeWidth={highlighted ? 3.5 : 2} strokeDasharray={dash[item.index % dash.length]} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {isolated.map(point => <circle key={point.t} cx={point.x} cy={point.y} r="3" fill={color(item.index)} className="cursor-pointer" />)}
      {item.qualifying.has(selectedTime) && <circle cx={selected.x} cy={selected.y} r={highlighted ? 5 : 3} fill={color(item.index)} stroke="var(--bg)" strokeWidth="1.5" className="cursor-pointer" />}
    </g>
  </g>;
}

export function MusicSeasonChart({ data, api = false, loading = false, error = false }: { data: MusicSeasonalDataset | null; api?: boolean; loading?: boolean; error?: boolean }) {
  const [metric, setMetric] = useState<SeasonalMetric>("genres");
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null), [hovered, setHovered] = useState<string | null>(null);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [songs, setSongs] = useState<SongSelection | null>(null);
  const [compact, setCompact] = useState(false);
  const trigger = useRef<HTMLElement | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const press = useRef<{ id: number; x: number; y: number; key: string; season: string; metric: SeasonalMetric } | null>(null);
  const interaction = useMusicChartInteraction(inspection !== null, () => setInspection(null), inspect);
  const id = useId();
  const [plotWidth, setPlotWidth] = useState(760);
  const observer = useRef<ResizeObserver | null>(null);
  const measurePlot = useCallback((node: HTMLDivElement | null) => {
    observer.current?.disconnect();
    if (node) { observer.current = new ResizeObserver(([entry]) => setPlotWidth(Math.max(240, Math.round(entry.contentRect.width)))); observer.current.observe(node); }
  }, []);
  useEffect(() => () => observer.current?.disconnect(), []);
  useEffect(() => {
    const media = matchMedia("(max-width: 760px)");
    const update = () => setCompact(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (songs && !data?.metrics[songs.metric].series.some(line => line.key === songs.key)) { setSongs(null); setPinned(null); }
  }, [data, songs]);

  const coordinates = { left: 56, right: plotWidth - 16, top: 24, bottom: 290 };
  const minimum = data?.minimumPlays || 11;
  const seasons = data?.seasons || [];
  const series = (data?.metrics[metric].series || []).filter(line => line.plays.some(plays => plays >= minimum)).map(line => ({ ...line, plays: line.plays.map(plays => plays >= minimum ? plays : 0) }));
  const selectedIndex = Math.max(0, selectedSeason ? seasons.findIndex(s => s.key === selectedSeason) : seasons.length - 1);
  const highlightKeys = (hovered ? [hovered] : inspection?.keys.length ? inspection.keys : pinned ? [pinned] : []).filter(key => series.some(line => line.key === key));
  const maximum = Math.max(1, ...series.flatMap(s => s.plays));
  const step = Math.max(1, Math.ceil(maximum / 4 / 10 ** Math.floor(Math.log10(maximum / 4 || 1))) * 10 ** Math.floor(Math.log10(maximum / 4 || 1)));
  const ceiling = Math.ceil(maximum / step) * step;
  const x = (i: number) => seasons.length < 2 ? (coordinates.left + coordinates.right) / 2 : coordinates.left + i / (seasons.length - 1) * (coordinates.right - coordinates.left);
  const labelStride = Math.max(1, Math.ceil(seasons.length / Math.max(2, Math.floor(plotWidth / 120))));
  const y = (plays: number) => coordinates.bottom - plays / ceiling * (coordinates.bottom - coordinates.top);
  const plotted = useMusicPresence(series.map((source, index) => ({
    key: metric + ":" + source.key, source, index,
    points: source.plays.map((plays, i) => ({ t: seasonTime(seasons[i].key), x: x(i), y: y(plays) })),
    qualifying: new Set(source.plays.flatMap((plays, i) => plays >= minimum ? [seasonTime(seasons[i].key)] : [])),
  })));
  const frames = useRef(new Map<string, MusicChartPoint[]>());
  const leaders = [...series].filter(line => line.plays[selectedIndex] >= minimum).sort((a, b) => b.plays[selectedIndex] - a.plays[selectedIndex] || a.key.localeCompare(b.key)).slice(0, 5);
  const legend = [...series].sort((a, b) => total(b) - total(a) || a.key.localeCompare(b.key));
  const tooltipSeries = (inspection?.keys.length ? series.filter(line => inspection.keys.includes(line.key)) : leaders).filter(line => line.plays[selectedIndex] >= minimum);

  function hit(event: PointInput, forced?: string) {
    if (!seasons.length || !svg.current) return null;
    const bounds = svg.current.getBoundingClientRect();
    const px = (event.clientX - bounds.left) / bounds.width * plotWidth;
    const py = (event.clientY - bounds.top) / bounds.height * 350;
    if (px < coordinates.left - 8 || px > coordinates.right + 8 || py < coordinates.top - 8 || py > coordinates.bottom + 8) return null;
    const index = nearestChartIndex((px - coordinates.left) / (coordinates.right - coordinates.left), seasons.length);
    const key = forced || (event.target instanceof Element ? event.target.closest(".music-season-line")?.getAttribute("data-key") : null);
    const known = key ? series.find(line => line.key === key && line.plays[index] >= minimum) : null;
    const distances = series.filter(line => line.plays[index] >= minimum).map(line => ({
      line, distance: Math.abs((frames.current.get(metric + ":" + line.key) ? chartPointAt(frames.current.get(metric + ":" + line.key)!, seasonTime(seasons[index].key)).y : y(line.plays[index])) - py),
    }));
    const nearest = Math.min(...distances.map(item => item.distance));
    const matches = known ? [known] : nearest <= 16 ? distances.filter(item => Math.abs(item.distance - nearest) < 1e-9).map(item => item.line) : [];
    return { index, matches, x: x(index) / plotWidth * 100, placement: py < 175 ? "bottom" as const : "top" as const };
  }
  function inspect(event: PointerEvent<SVGSVGElement>) {
    const value = hit(event);
    if (!value) { setInspection(null); return; }
    setSelectedSeason(seasons[value.index].key); setHovered(null);
    setInspection({ keys: value.matches.map(line => line.key), x: value.x, placement: value.placement });
  }
  function openSongs(key: string, season: string | null, owner: HTMLElement | null) {
    const line = data?.metrics[metric].series.find(line => line.key === key);
    if (!line) return;
    trigger.current = owner;
    setSongs({ metric, key, name: line.name, artists: line.artists, season }); setPinned(key); setHovered(null); setInspection(null);
  }
  function closeSongs() {
    setSongs(null); setPinned(null); setHovered(null); setInspection(null);
    requestAnimationFrame(() => { (trigger.current?.isConnected ? trigger.current : interaction.ref.current)?.focus({ preventScroll: true }); setHovered(null); });
  }
  function beginSelection(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !event.isPrimary || !(event.target instanceof Element) || !event.target.closest(".music-season-svg")) return;
    const value = hit(event);
    if (!value?.matches[0]) return;
    press.current = { id: event.pointerId, x: event.clientX, y: event.clientY, key: value.matches[0].key, season: seasons[value.index].key, metric };
    // Keep release events on the chart if inspection opens a tooltip beneath the pointer.
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function finishSelection(event: PointerEvent<HTMLDivElement>) {
    const start = press.current;
    press.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!start || start.id !== event.pointerId || start.metric !== metric || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) return;
    setSelectedSeason(start.season);
    openSongs(start.key, start.season, interaction.ref.current);
  }
  function explore(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || !seasons.length) return;
    const next = event.key === "ArrowLeft" ? Math.max(0, selectedIndex - 1) : event.key === "ArrowRight" ? Math.min(seasons.length - 1, selectedIndex + 1) : event.key === "Home" ? 0 : event.key === "End" ? seasons.length - 1 : undefined;
    if (next !== undefined) {
      event.preventDefault(); setSelectedSeason(seasons[next].key); setHovered(null);
      setInspection({ keys: [], x: x(next) / plotWidth * 100, placement: "top" });
    } else if ((event.key === "ArrowUp" || event.key === "ArrowDown") && series.length) {
      event.preventDefault(); const current = series.findIndex(line => line.key === highlightKeys[0]);
      const index = current < 0 ? event.key === "ArrowDown" ? 0 : series.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + series.length) % series.length;
      setHovered(series[index].key);
      setInspection({ keys: [series[index].key], x: x(selectedIndex) / plotWidth * 100, placement: "top" });
    } else if (event.key === "Enter" || event.key === " ") {
      const key = highlightKeys[0] || leaders[0]?.key;
      if (key) { event.preventDefault(); openSongs(key, seasons[selectedIndex].key, event.currentTarget); }
    } else if (event.key === "Escape") { event.preventDefault(); closeSongs(); }
  }

  return <section className="music-season-panel panel rounded-[28px] p-5 sm:p-8" aria-labelledby={id + "-heading"} aria-busy={loading}>
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div><p className="music-label">Every season has its favorites</p><h2 id={id + "-heading"} className="mt-2 font-display text-[clamp(36px,4vw,48px)] leading-none">The changing <em className="text-accent">soundtrack.</em></h2></div>
      <div className="music-tabs" role="group" aria-label="Seasonal chart metric">{metrics.map(value => <button key={value} aria-pressed={metric === value} onClick={() => { setMetric(value); setSongs(null); setPinned(null); setHovered(null); setInspection(null); }} className="capitalize">{value}</button>)}</div>
    </div>
    <p className="mt-4 max-w-[80ch] text-[14px] leading-relaxed text-muted">The top five from each season, across the whole collection. Only seasonal totals with more than 10 plays appear.</p>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted"><span>{loading ? "Updating seasonal history…" : error ? "Seasonal history is unavailable. Try reloading." : number(series.length) + " lines · Plays per season"}</span></div>
    <div hidden={!seasons.length}>
      <div className="music-season-layout mt-5" data-expanded={!!songs || undefined}>
        <div className="music-season-plot min-w-0" ref={measurePlot}>
          <p className="music-label mb-2">Recorded plays</p>
          <div ref={interaction.ref} className="music-chart-surface" role="group" tabIndex={0} inert={!!songs && compact ? true : undefined} aria-label="Seasonal listening chart" aria-describedby={id + "-chart-help" + (inspection ? " " + id + "-tooltip" : "")} onPointerDownCapture={beginSelection} onPointerUpCapture={finishSelection} onPointerMoveCapture={event => { const start = press.current; if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) press.current = null; }} onPointerCancelCapture={() => { press.current = null; setInspection(null); }} onLostPointerCapture={() => { press.current = null; }} onKeyDown={explore} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget) && !isMusicCardTarget(event.relatedTarget)) setInspection(null); }} onPointerLeave={event => { if (event.pointerType !== "touch" && !event.currentTarget.contains(document.activeElement) && !isMusicCardTarget(event.relatedTarget)) setInspection(null); }}>
            <p id={id + "-chart-help"} className="sr-only">Use Left and Right to explore seasons, Up and Down to highlight lines, Enter to open songs for the selected line, and Escape to clear the selection.</p>
            <svg ref={svg} viewBox={"0 0 " + plotWidth + " 350"} preserveAspectRatio="none" className="music-season-svg" role="img" aria-labelledby={id + "-chart-title " + id + "-chart-description"} onPointerMove={interaction.onPointerMove} onPointerDown={interaction.onPointerDown} onPointerUp={interaction.onPointerUp} onPointerCancel={interaction.onPointerCancel}>
              <title id={id + "-chart-title"}>{"Seasonal top " + metric + ", all time"}</title>
              <desc id={id + "-chart-description"}>{series.length + " series selected from each season's top five with at least 11 plays. Lower-volume periods appear as gaps. Select a line or legend entry to view its songs."}</desc>
              {Array.from({ length: Math.round(ceiling / step) + 1 }, (_, i) => i * step).map(value => <g key={value} pointerEvents="none"><line x1={coordinates.left} x2={coordinates.right} y1={y(value)} y2={y(value)} stroke="var(--line)" strokeDasharray="3 6" /><text x={coordinates.left - 8} y={y(value) + 4} textAnchor="end" fill="var(--mute)" fontSize="13">{number(value)}</text></g>)}
              {seasons.map((season, i) => <g key={season.key} pointerEvents="none">{(i === seasons.length - 1 || i % labelStride === 0 && (i === 0 || x(seasons.length - 1) - x(i) >= 90)) && <text x={x(i)} y="319" textAnchor={i === 0 && seasons.length > 1 ? "start" : i === seasons.length - 1 && seasons.length > 1 ? "end" : "middle"} fill="var(--mute)" fontSize="13">{season.label.split(" ")[0]}<tspan x={x(i)} dy="17">{season.label.split(" ")[1]}</tspan></text>}</g>)}
              {inspection && <line x1={x(selectedIndex)} x2={x(selectedIndex)} y1={coordinates.top} y2={coordinates.bottom} stroke="var(--ink)" opacity=".25" pointerEvents="none" />}
              {plotted.map(({ item, phase }) => <SeasonLine key={item.key} item={item} phase={phase} selectedTime={seasons[selectedIndex] ? seasonTime(seasons[selectedIndex].key) : 0} highlighted={highlightKeys.includes(item.source.key)} dimmed={highlightKeys.length > 0 && !highlightKeys.includes(item.source.key)} frames={frames.current} />)}
            </svg>
            {inspection && <MusicChartTooltip id={id + "-tooltip"} title={seasons[selectedIndex]?.label || ""} x={inspection.x} placement={inspection.placement} onCardClose={() => setInspection(null)} rows={tooltipSeries.map(line => ({
              key: line.key, label: line.name, entity: metric === "genres" ? undefined : { kind: metric === "artists" ? "artist" : "album", name: line.name, artists: line.artists, url: line.url },
              artists: line.artists, detail: line.artists.join(", "), value: line.plays[selectedIndex] || 0, color: color(series.indexOf(line)),
              onSelect: () => openSongs(line.key, seasons[selectedIndex].key, interaction.ref.current),
            }))} />}
          </div>
        </div>
        {songs && <MusicSeasonSongs selection={songs} file={data?.songFiles?.[songs.metric]?.[songs.key] || (songs.metric === "genres" ? data?.genreFiles?.[songs.key] : undefined)} api={api} seasonLabel={seasons.find(season => season.key === songs.season)?.label} close={closeSongs} />}
      </div>
      <div className="mt-5 flex items-center justify-between gap-3 text-[13px] text-muted"><p>{"Select " + (metric === "artists" ? "an " : "a ") + metric.slice(0, -1) + " to explore its songs. Legend counts span all qualifying seasons."}</p><button className={"shrink-0 text-accent underline underline-offset-4" + (pinned ? "" : " invisible")} disabled={!pinned} aria-hidden={!pinned || undefined} tabIndex={pinned ? 0 : -1} onClick={closeSongs}>Show all</button></div>
      <div className="music-season-legend mt-3" role="group" aria-label={metric + " chart legend"}>{legend.map(line => { const index = series.indexOf(line); return <button key={line.key} type="button" className="music-season-chip" data-highlighted={pinned === line.key || undefined} aria-pressed={pinned === line.key} onClick={event => { if (songs?.metric === metric && songs.key === line.key && songs.season === null) closeSongs(); else openSongs(line.key, null, event.currentTarget); }} onPointerEnter={event => { if (event.pointerType !== "touch") setHovered(line.key); }} onPointerLeave={() => setHovered(null)} onFocus={event => { if (event.currentTarget.matches(":focus-visible")) setHovered(line.key); }} onBlur={() => setHovered(null)}>
        <svg width="24" height="8" viewBox="0 0 24 8" aria-hidden="true" className="shrink-0"><line x1="0" x2="24" y1="4" y2="4" stroke={color(index)} strokeWidth="2.5" strokeDasharray={dash[index % dash.length]} /></svg>
        <span className="min-w-0 truncate">{line.name}{line.artists.length > 0 && <span className="text-muted"> · {line.artists.join(", ")}</span>}</span>
        <span className="shrink-0 tabular-nums text-muted"><MusicNumber value={total(line)} /><span className="sr-only"> plays</span></span>
      </button>; })}</div>
    </div>
    {!seasons.length && <div className="music-season-empty mt-6 flex min-h-64 flex-col items-center justify-center rounded-[20px] border border-dashed border-line p-6 text-center"><p className="font-display text-[32px]">{loading ? "Finding the soundtrack…" : "More music details to come."}</p><p className="mt-3 max-w-[46ch] text-[14px] leading-relaxed text-muted">The chart will grow as listening history arrives.</p></div>}
  </section>;
}
