"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { type MusicSoundtrackDataset, type SoundtrackMetric, type SoundtrackSeries } from "@/lib/music/types";
import { MusicChartTooltip } from "./music-chart-tooltip";
import { chartPointAt, musicLinePath, nearestChartIndex, type MusicChartPoint } from "@/lib/music/chart-interaction";
import { MusicNumber, useMusicLineMotion, useMusicPresence } from "./music-motion";
import { isMusicCardTarget } from "./music-entity-link";
import { useMusicChartInteraction } from "./use-music-chart-interaction";
import { MusicSoundtrackSongs, type SongSelection } from "./music-soundtrack-songs";

const number = (value: number) => new Intl.NumberFormat("en-US").format(value);
const metrics: SoundtrackMetric[] = ["genres", "artists", "albums"];
const colors = [
  "var(--acc)",
  "light-dark(#986c28, #dfc28c)",
  "light-dark(#287d83, #8dd5d3)",
  "light-dark(#a04d87, #e6a2cc)",
  "light-dark(#4268b0, #94b7f5)",
  "light-dark(#a35849, #e9ab9e)",
  "light-dark(#8650ad, #cc9fe8)",
  "light-dark(#606f86, #b7c8de)",
];
const color = (index: number) => colors[index % colors.length];
const dash = (index: number) => {
  // Give the highest totals every solid color before introducing dash patterns.
  const group = Math.floor(index / colors.length);
  return group < 4 ? [undefined, "8 4", "2 4", "10 3 2 3"][group] : `${14 + (group - 4) * 4} 4 2 4`;
};
const total = (series: SoundtrackSeries) => series.plays.reduce((a, b) => a + b, 0);
const bucketTime = (key: string) => Date.parse(key + (key.length === 4 ? "-01-01" : key.length === 7 ? "-01" : "") + "T12:00:00Z");
interface PlotSeries { key: string; source: SoundtrackSeries; points: MusicChartPoint[]; index: number; qualifying: Set<number> }
interface Inspection { keys: string[]; x: number }
interface PointInput { clientX: number; clientY: number; target: EventTarget | null }

function SoundtrackLine({ item, phase, selectedTime, highlighted, dimmed, frames }: { item: PlotSeries; phase: "present" | "enter" | "exit"; selectedTime: number; highlighted: boolean; dimmed: boolean; frames: Map<string, MusicChartPoint[]> }) {
  const points = useMusicLineMotion(phase === "exit" ? [] : item.points, 290, phase === "enter");
  useLayoutEffect(() => { frames.set(item.key, points); return () => { frames.delete(item.key); }; }, [frames, item.key, points]);
  const path = musicLinePath(points, point => item.qualifying.has(point.t));
  const isolated = points.filter((point, i) => item.qualifying.has(point.t) && !item.qualifying.has(points[i - 1]?.t) && !item.qualifying.has(points[i + 1]?.t));
  const selected = chartPointAt(points, selectedTime);
  return <g className="music-series-presence" data-phase={phase} aria-hidden={phase === "exit" || undefined} pointerEvents={phase === "exit" ? "none" : undefined}>
    <g className="music-soundtrack-line" data-key={item.source.key} style={{ opacity: dimmed ? .13 : 1 }}>
      <path className="music-soundtrack-path cursor-pointer" d={path} stroke={color(item.index)} strokeWidth={highlighted ? 3.5 : 2} strokeDasharray={dash(item.index)} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {isolated.map(point => <circle key={point.t} cx={point.x} cy={point.y} r="3" fill={color(item.index)} className="cursor-pointer" />)}
      {item.qualifying.has(selectedTime) && <circle cx={selected.x} cy={selected.y} r={highlighted ? 5 : 3} fill={color(item.index)} stroke="var(--bg)" strokeWidth="1.5" className="cursor-pointer" />}
    </g>
  </g>;
}

export function MusicSoundtrackChart({ data, period, api = false, loading = false, error = false }: { data: MusicSoundtrackDataset | null; period: string; api?: boolean; loading?: boolean; error?: boolean }) {
  const [metric, setMetric] = useState<SoundtrackMetric>("genres");
  const granularity = data?.granularity || (period === "30d" ? "day" : period === "all" ? "year" : "month");
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null), [hovered, setHovered] = useState<string | null>(null);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [songs, setSongs] = useState<SongSelection | null>(null);
  const [compact, setCompact] = useState(false);
  const trigger = useRef<HTMLElement | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const press = useRef<{ id: number; x: number; y: number; key: string; bucket: string; metric: SoundtrackMetric } | null>(null);
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

  useEffect(() => { setSelectedBucket(null); setSongs(null); setPinned(null); setHovered(null); setInspection(null); press.current = null; }, [data?.period]);

  const coordinates = { left: 56, right: plotWidth - 16, top: 24, bottom: 290 };
  const minimum = data?.minimumPlays ?? (period === "30d" ? 1 : 11);
  // With no play cutoff, zero is an observed count rather than a missing point.
  const pointMinimum = minimum === 1 ? 0 : minimum;
  const buckets = data?.buckets || [];
  const periodName = granularity;
  const chartName = granularity === "day" ? "Daily" : granularity === "month" ? "Monthly" : "Yearly";
  const rangeLabel = data?.period === "all" ? "All time" : data?.period === "30d" ? "Last 30 days" : data?.period === "365d" ? "Last year" : data?.period || period;
  const series = (data?.metrics[metric].series || []).filter(line => line.plays.some(plays => plays >= minimum)).map(line => ({ ...line, plays: line.plays.map(plays => plays >= minimum ? plays : 0) })).sort((a, b) => total(b) - total(a) || a.key.localeCompare(b.key));
  const selectedIndex = Math.max(0, selectedBucket ? buckets.findIndex(s => s.key === selectedBucket) : buckets.length - 1);
  const highlightKeys = (hovered ? [hovered] : inspection?.keys.length ? inspection.keys : pinned ? [pinned] : []).filter(key => series.some(line => line.key === key));
  const maximum = Math.max(1, ...series.flatMap(s => s.plays));
  const step = Math.max(1, Math.ceil(maximum / 4 / 10 ** Math.floor(Math.log10(maximum / 4 || 1))) * 10 ** Math.floor(Math.log10(maximum / 4 || 1)));
  const ceiling = Math.ceil(maximum / step) * step;
  const x = (i: number) => buckets.length < 2 ? (coordinates.left + coordinates.right) / 2 : coordinates.left + i / (buckets.length - 1) * (coordinates.right - coordinates.left);
  const labelStride = Math.max(1, Math.ceil(buckets.length / Math.max(2, Math.floor(plotWidth / 120))));
  const y = (plays: number) => coordinates.bottom - plays / ceiling * (coordinates.bottom - coordinates.top);
  const plotted = useMusicPresence(series.map((source, index) => ({
    key: granularity + ":" + metric + ":" + source.key, source, index,
    points: source.plays.map((plays, i) => ({ t: bucketTime(buckets[i].key), x: x(i), y: y(plays) })),
    qualifying: new Set(source.plays.flatMap((plays, i) => plays >= pointMinimum ? [bucketTime(buckets[i].key)] : [])),
  })));
  const frames = useRef(new Map<string, MusicChartPoint[]>());
  const leaders = [...series].filter(line => line.plays[selectedIndex] >= pointMinimum).sort((a, b) => b.plays[selectedIndex] - a.plays[selectedIndex] || a.key.localeCompare(b.key)).slice(0, 5);
  const legend = series;
  const tooltipSeries = (inspection?.keys.length ? series.filter(line => inspection.keys.includes(line.key)) : leaders).filter(line => line.plays[selectedIndex] >= pointMinimum);

  function hit(event: PointInput, forced?: string) {
    if (!buckets.length || !svg.current) return null;
    const bounds = svg.current.getBoundingClientRect();
    const px = (event.clientX - bounds.left) / bounds.width * plotWidth;
    const py = (event.clientY - bounds.top) / bounds.height * 350;
    if (px < coordinates.left - 8 || px > coordinates.right + 8 || py < coordinates.top - 8 || py > coordinates.bottom + 8) return null;
    const index = nearestChartIndex((px - coordinates.left) / (coordinates.right - coordinates.left), buckets.length);
    const key = forced || (event.target instanceof Element ? event.target.closest(".music-soundtrack-line")?.getAttribute("data-key") : null);
    const known = key ? series.find(line => line.key === key && line.plays[index] >= pointMinimum) : null;
    const distances = series.filter(line => line.plays[index] >= pointMinimum).map(line => ({
      line, distance: Math.abs((frames.current.get(granularity + ":" + metric + ":" + line.key) ? chartPointAt(frames.current.get(granularity + ":" + metric + ":" + line.key)!, bucketTime(buckets[index].key)).y : y(line.plays[index])) - py),
    }));
    const nearest = Math.min(...distances.map(item => item.distance));
    const matches = known ? [known] : nearest <= 16 ? distances.filter(item => Math.abs(item.distance - nearest) < 1e-9).map(item => item.line) : [];
    return { index, matches, x: x(index) / plotWidth * 100 };
  }
  function inspect(event: PointerEvent<SVGSVGElement>) {
    const value = hit(event);
    if (!value) { setInspection(null); return; }
    setSelectedBucket(buckets[value.index].key); setHovered(null);
    setInspection({ keys: value.matches.map(line => line.key), x: value.x });
  }
  function openSongs(key: string, bucket: string | null, owner: HTMLElement | null) {
    const line = series.find(line => line.key === key);
    if (!line) return;
    trigger.current = owner;
    setSongs({ metric, key, name: line.name, artists: line.artists, bucket, period: data!.period }); setPinned(key); setHovered(null); setInspection(null);
  }
  function closeSongs() {
    setSongs(null); setPinned(null); setHovered(null); setInspection(null);
    requestAnimationFrame(() => { (trigger.current?.isConnected ? trigger.current : interaction.ref.current)?.focus({ preventScroll: true }); setHovered(null); });
  }
  function beginSelection(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !event.isPrimary || !(event.target instanceof Element) || !event.target.closest(".music-soundtrack-svg")) return;
    const value = hit(event);
    if (!value?.matches[0]) return;
    press.current = { id: event.pointerId, x: event.clientX, y: event.clientY, key: value.matches[0].key, bucket: buckets[value.index].key, metric };
    // Keep release events on the chart if inspection opens a tooltip beneath the pointer.
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function finishSelection(event: PointerEvent<HTMLDivElement>) {
    const start = press.current;
    press.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!start || start.id !== event.pointerId || start.metric !== metric || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) return;
    setSelectedBucket(start.bucket);
    openSongs(start.key, start.bucket, interaction.ref.current);
  }
  function explore(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || !buckets.length) return;
    const next = event.key === "ArrowLeft" ? Math.max(0, selectedIndex - 1) : event.key === "ArrowRight" ? Math.min(buckets.length - 1, selectedIndex + 1) : event.key === "Home" ? 0 : event.key === "End" ? buckets.length - 1 : undefined;
    if (next !== undefined) {
      event.preventDefault(); setSelectedBucket(buckets[next].key); setHovered(null);
      setInspection({ keys: [], x: x(next) / plotWidth * 100 });
    } else if ((event.key === "ArrowUp" || event.key === "ArrowDown") && series.length) {
      event.preventDefault(); const current = series.findIndex(line => line.key === highlightKeys[0]);
      const index = current < 0 ? event.key === "ArrowDown" ? 0 : series.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + series.length) % series.length;
      setHovered(series[index].key);
      setInspection({ keys: [series[index].key], x: x(selectedIndex) / plotWidth * 100 });
    } else if (event.key === "Enter" || event.key === " ") {
      const key = highlightKeys[0] || leaders[0]?.key;
      if (key) { event.preventDefault(); openSongs(key, buckets[selectedIndex].key, event.currentTarget); }
    } else if (event.key === "Escape") { event.preventDefault(); closeSongs(); }
  }

  return <section className="music-soundtrack-panel panel rounded-[28px] p-5 sm:p-8" aria-labelledby={id + "-heading"} aria-busy={loading}>
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div><p className="music-label">Every era has its favorites</p><h2 id={id + "-heading"} className="mt-2 font-display text-[clamp(36px,4vw,48px)] leading-none">The changing <em className="text-accent">soundtrack.</em></h2></div>
      <div className="music-tabs" role="group" aria-label="Soundtrack chart metric">{metrics.map(value => <button key={value} aria-pressed={metric === value} onClick={() => { setMetric(value); setSongs(null); setPinned(null); setHovered(null); setInspection(null); }} className="capitalize">{value}</button>)}</div>
    </div>
    <p className="mt-4 max-w-[80ch] text-[14px] leading-relaxed text-muted">The top five from each {periodName}, in the selected date range. {minimum > 1 ? `Only totals with more than ${minimum - 1} plays appear. ` : ""}Songs may have multiple genres based on their artists.</p>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted"><span aria-live="polite">{loading ? "Updating soundtrack history…" : error ? "Soundtrack history is unavailable. Try reloading." : number(series.length) + " lines · Plays per " + periodName}</span></div>
    <div hidden={!buckets.length}>
      <div className="music-soundtrack-layout mt-5" data-expanded={!!songs || undefined}>
        <div className="music-soundtrack-plot min-w-0" ref={measurePlot}>
          <p className="music-label mb-2">Recorded plays</p>
          <div ref={interaction.ref} className="music-chart-surface" role="group" tabIndex={0} inert={!!songs && compact ? true : undefined} aria-label={chartName + " listening chart"} aria-describedby={id + "-chart-help" + (inspection ? " " + id + "-tooltip" : "")} onPointerDownCapture={beginSelection} onPointerUpCapture={finishSelection} onPointerMoveCapture={event => { const start = press.current; if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) press.current = null; }} onPointerCancelCapture={() => { press.current = null; setInspection(null); }} onLostPointerCapture={() => { press.current = null; }} onKeyDown={explore} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget) && !isMusicCardTarget(event.relatedTarget)) setInspection(null); }} onPointerLeave={event => { if (event.pointerType !== "touch" && !event.currentTarget.contains(document.activeElement) && !isMusicCardTarget(event.relatedTarget)) setInspection(null); }}>
            <p id={id + "-chart-help"} className="sr-only">Use Left and Right to explore {periodName}s, Up and Down to highlight lines, Enter to open songs for the selected line, and Escape to clear the selection.</p>
            <svg ref={svg} viewBox={"0 0 " + plotWidth + " 350"} preserveAspectRatio="none" className="music-soundtrack-svg" role="img" aria-labelledby={id + "-chart-title " + id + "-chart-description"} onPointerMove={interaction.onPointerMove} onPointerDown={interaction.onPointerDown} onPointerUp={interaction.onPointerUp} onPointerCancel={interaction.onPointerCancel}>
              <title id={id + "-chart-title"}>{chartName + " top " + metric + ", " + rangeLabel}</title>
              <desc id={id + "-chart-description"}>{series.length + " series selected from each " + periodName + "'s top five. " + (minimum > 1 ? "Only totals with at least " + minimum + " plays appear. Lower-volume periods appear as gaps. " : "Days without recorded plays appear at zero. ") + "Select a line or legend entry to view its songs."}</desc>
              {Array.from({ length: Math.round(ceiling / step) + 1 }, (_, i) => i * step).map(value => <g key={value} pointerEvents="none"><line x1={coordinates.left} x2={coordinates.right} y1={y(value)} y2={y(value)} stroke="var(--line)" strokeDasharray="3 6" /><text x={coordinates.left - 8} y={y(value) + 4} textAnchor="end" fill="var(--mute)" fontSize="13">{number(value)}</text></g>)}
              {buckets.map((bucket, i) => <g key={bucket.key} pointerEvents="none">{(i === buckets.length - 1 || i % labelStride === 0 && (i === 0 || x(buckets.length - 1) - x(i) >= 90)) && <text x={x(i)} y="319" textAnchor={i === 0 && buckets.length > 1 ? "start" : i === buckets.length - 1 && buckets.length > 1 ? "end" : "middle"} fill="var(--mute)" fontSize="13">{granularity === "year" ? bucket.label : bucket.label.replace(/,? \d{4}$/, "")}<tspan x={x(i)} dy="17">{granularity === "year" ? "" : bucket.key.slice(0, 4)}</tspan></text>}</g>)}
              {inspection && <line x1={x(selectedIndex)} x2={x(selectedIndex)} y1={coordinates.top} y2={coordinates.bottom} stroke="var(--ink)" opacity=".25" pointerEvents="none" />}
              {plotted.map(({ item, phase }) => <SoundtrackLine key={item.key} item={item} phase={phase} selectedTime={buckets[selectedIndex] ? bucketTime(buckets[selectedIndex].key) : 0} highlighted={highlightKeys.includes(item.source.key)} dimmed={highlightKeys.length > 0 && !highlightKeys.includes(item.source.key)} frames={frames.current} />)}
            </svg>
            {inspection && <MusicChartTooltip id={id + "-tooltip"} title={buckets[selectedIndex]?.label || ""} x={inspection.x} preferTop onCardClose={() => setInspection(null)} rows={tooltipSeries.map(line => ({
              key: line.key, label: line.name, entity: metric === "genres" ? undefined : { kind: metric === "artists" ? "artist" : "album", name: line.name, artists: line.artists, url: line.url },
              artists: line.artists, detail: line.artists.join(", "), value: line.plays[selectedIndex] || 0, color: color(series.indexOf(line)),
              onSelect: () => openSongs(line.key, buckets[selectedIndex].key, interaction.ref.current),
            }))} />}
          </div>
        </div>
        {songs && <MusicSoundtrackSongs selection={songs} file={data?.songFiles?.[songs.metric]?.[songs.key]} api={api} bucketLabel={buckets.find(bucket => bucket.key === songs.bucket)?.label} rangeLabel={rangeLabel} close={closeSongs} />}
      </div>
      <div className="mt-5 flex items-center justify-between gap-3 text-[13px] text-muted"><p>{"Select " + (metric === "artists" ? "an " : "a ") + metric.slice(0, -1) + " to explore its songs. Legend counts span all qualifying " + periodName + "s."}</p><button className={"shrink-0 text-accent underline underline-offset-4" + (pinned ? "" : " invisible")} disabled={!pinned} aria-hidden={!pinned || undefined} tabIndex={pinned ? 0 : -1} onClick={closeSongs}>Show all</button></div>
      <div className="music-soundtrack-legend mt-3" role="group" aria-label={metric + " chart legend"}>{legend.map(line => { const index = series.indexOf(line); return <button key={line.key} type="button" className="music-soundtrack-chip" data-highlighted={pinned === line.key || undefined} aria-pressed={pinned === line.key} onClick={event => { if (songs?.metric === metric && songs.key === line.key && songs.bucket === null) closeSongs(); else openSongs(line.key, null, event.currentTarget); }} onPointerEnter={event => { if (event.pointerType !== "touch") setHovered(line.key); }} onPointerLeave={() => setHovered(null)} onFocus={event => { if (event.currentTarget.matches(":focus-visible")) setHovered(line.key); }} onBlur={() => setHovered(null)}>
        <svg width="24" height="8" viewBox="0 0 24 8" aria-hidden="true" className="shrink-0"><line x1="0" x2="24" y1="4" y2="4" stroke={color(index)} strokeWidth="2.5" strokeDasharray={dash(index)} /></svg>
        <span className="min-w-0 truncate">{line.name}{line.artists.length > 0 && <span className="text-muted"> · {line.artists.join(", ")}</span>}</span>
        <span className="shrink-0 tabular-nums text-muted"><MusicNumber value={total(line)} /><span className="sr-only"> plays</span></span>
      </button>; })}</div>
    </div>
    {!buckets.length && <div className="music-soundtrack-empty mt-6 flex min-h-64 flex-col items-center justify-center rounded-[20px] border border-dashed border-line p-6 text-center"><p className="font-display text-[32px]">{loading ? "Finding the soundtrack…" : "More music details to come."}</p><p className="mt-3 max-w-[46ch] text-[14px] leading-relaxed text-muted">{data ? "No recorded listening history in this date range." : "Soundtrack history is being updated for this date range."}</p></div>}
  </section>;
}
