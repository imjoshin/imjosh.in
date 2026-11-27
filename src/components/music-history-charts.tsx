"use client";

import { useId, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { MusicDataset } from "@/lib/music/types";
import { chartPointAt, musicLinePath } from "@/lib/music/chart-interaction";
import { listeningChartBuckets } from "@/lib/music/listening-chart";
import { MusicChartTooltip } from "./music-chart-tooltip";
import { useMusicLineMotion, useMusicPresence } from "./music-motion";
import { useMusicChartInteraction } from "./use-music-chart-interaction";

const number = (value: number) => new Intl.NumberFormat("en-US").format(value);
const monthLabel = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}-01T12:00:00Z`));
const dayLabel = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
const share = (plays: number, total: number) => `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(total ? plays / total * 100 : 0)}% of this period`;
const dateTime = (date: string) => Date.parse(`${date.length === 7 ? `${date}-01` : date}T12:00:00Z`) / 86400000;

export function ListeningChart({ data }: { data: MusicDataset }) {
  const id = useId().replaceAll(":", ""), tooltipId = `${id}-tooltip`, helpId = `${id}-help`;
  const [active, setActive] = useState<string | null>(null);
  const daily = data.period === "30d";
  const buckets = listeningChartBuckets(data);
  const label = daily ? dayLabel : monthLabel;
  const index = active === null || !buckets.length ? null : Math.max(0, buckets.findIndex(bucket => bucket.key === active));
  const selected = index === null ? null : buckets[index];
  const interaction = useMusicChartInteraction(active !== null, () => setActive(null), inspect);
  const maximum = Math.max(1, ...buckets.map(bucket => bucket.plays));
  const points = useMusicLineMotion(buckets.map((bucket, i) => ({ t: dateTime(bucket.key), x: buckets.length === 1 ? 300 : 12 + i / (buckets.length - 1) * 576, y: 166 - bucket.plays / maximum * 142 })), 180);
  const dots = useMusicPresence(daily || buckets.length <= 24 ? buckets.map(bucket => ({ key: bucket.key })) : []);
  const point = (date: string) => chartPointAt(points, dateTime(date));
  const selectedPoint = selected ? point(selected.key) : null;
  const line = musicLinePath(points);
  function inspect(event: PointerEvent<SVGSVGElement>) {
    if (!buckets.length) return;
    const box = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - box.left) / box.width * 600;
    const nearest = buckets.reduce((best, bucket) => Math.abs(point(bucket.key).x - px) < Math.abs(point(best.key).x - px) ? bucket : best);
    setActive(nearest.key);
  }
  function key(event: KeyboardEvent<HTMLDivElement>) {
    if (!buckets.length) return;
    const current = index ?? buckets.length - 1;
    const next = event.key === "ArrowLeft" ? Math.max(0, current - 1) : event.key === "ArrowRight" ? Math.min(buckets.length - 1, current + 1) : event.key === "Home" ? 0 : event.key === "End" ? buckets.length - 1 : event.key === "Escape" ? null : undefined;
    if (next !== undefined) { event.preventDefault(); setActive(next === null ? null : buckets[next].key); }
  }
  return <figure data-analytics-section="listening_curve" data-analytics-chart="listening" data-analytics-metric="plays" data-analytics-period={data.period} className="music-history-chart panel rounded-[24px] p-5 sm:p-7">
    <figcaption className="flex items-start justify-between gap-4"><div><p className="music-label">The listening curve</p><h2 className="mt-2 font-display text-[36px] leading-none">A little more <em className="text-accent">volume.</em></h2></div><span className="pt-1 text-[13px] text-muted">{daily ? "Plays per day" : "Recorded plays"}</span></figcaption>
    <div ref={interaction.ref} className="music-chart-surface mt-7" role="group" tabIndex={0} aria-label={`${daily ? "Daily" : "Monthly"} listening chart`} aria-describedby={`${helpId}${selected ? ` ${tooltipId}` : ""}`} onBlur={() => setActive(null)} onKeyDown={key} onPointerLeave={event => { if (event.pointerType !== "touch" && document.activeElement !== event.currentTarget) setActive(null); }}>
      <p id={helpId} className="sr-only">Use Left and Right to explore {daily ? "days" : "months"}, Home and End to jump, and Escape to dismiss details.</p>
      <svg viewBox="0 0 600 190" role="img" aria-label={`Recorded listening by ${daily ? "day" : "month"}. ${buckets.map(bucket => `${label(bucket.key)}: ${bucket.plays}`).join(". ")}`} className="w-full overflow-visible" onPointerMove={interaction.onPointerMove} onPointerDown={interaction.onPointerDown} onPointerUp={interaction.onPointerUp} onPointerCancel={interaction.onPointerCancel}>
        <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop stopColor="var(--acc)" stopOpacity=".3" /><stop offset="1" stopColor="var(--acc)" stopOpacity="0" /></linearGradient></defs>
        {[24, 95, 166].map(value => <line key={value} x1="12" x2="588" y1={value} y2={value} stroke="var(--line)" strokeDasharray="3 6" />)}
        {line && <><path d={`${line} L ${points.at(-1)!.x},180 L ${points[0].x},180 Z`} fill={`url(#${id})`} /><path d={line} fill="none" stroke="var(--acc)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />{dots.map(({ item, phase }) => <circle key={item.key} className="music-point" data-phase={phase} cx={point(item.key).x} cy={point(item.key).y} r="3.5" fill="var(--bg)" stroke="var(--acc)" strokeWidth="2" />)}</>}
        {selectedPoint && <g aria-hidden="true"><line x1={selectedPoint.x} x2={selectedPoint.x} y1="12" y2="180" stroke="var(--acc)" strokeDasharray="3 5" opacity=".6" /><circle cx={selectedPoint.x} cy={selectedPoint.y} r="10" fill="var(--acc)" opacity=".15" /><circle cx={selectedPoint.x} cy={selectedPoint.y} r="5" fill="var(--bg)" stroke="var(--acc)" strokeWidth="2.5" /></g>}
      </svg>
      {selected && selectedPoint && <MusicChartTooltip analyticsBucket={selected.key} id={tooltipId} title={label(selected.key)} rows={[{ key: selected.key, label: "Recorded plays", value: selected.plays }]} x={selectedPoint.x / 6} preferTop secondary={share(selected.plays, data.stats.plays)} />}
    </div>
    <div className="mt-1 flex justify-between text-[13px] text-muted"><span>{buckets[0] ? label(buckets[0].key) : daily ? "Daily history is on its way" : "History is on its way"}</span><span>{buckets.length > 1 ? label(buckets.at(-1)!.key) : ""}</span></div>
  </figure>;
}

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export function WeekdayChart({ data }: { data: MusicDataset }) {
  const [active, setActive] = useState<number | null>(null);
  const interaction = useMusicChartInteraction(active !== null, () => setActive(null));
  const tooltipId = useId(), maximum = Math.max(1, ...data.stats.weekdays);
  const select = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "Escape") { event.preventDefault(); setActive(null); return; }
    const next = event.key === "ArrowLeft" ? (index + 6) % 7 : event.key === "ArrowRight" ? (index + 1) % 7 : event.key === "Home" ? 0 : event.key === "End" ? 6 : undefined;
    if (next !== undefined) { event.preventDefault(); event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus(); setActive(next); }
  };
  return <figure data-analytics-section="weekday" data-analytics-chart="weekday" data-analytics-metric="plays" data-analytics-period={data.period} className="music-history-chart panel flex flex-col rounded-[24px] p-5 sm:p-7">
    <figcaption><p className="music-label">A weekly rhythm</p><h2 className="mt-2 font-display text-[36px] leading-none">Day by <em className="text-accent">day.</em></h2></figcaption>
    <div ref={interaction.ref} className="music-chart-surface mt-8 flex min-h-40 flex-1 items-end gap-3" role="group" aria-label="Listening by weekday" data-inspecting={active !== null || undefined} onPointerDown={interaction.onPointerDown} onPointerCancel={interaction.onPointerCancel} onPointerLeave={event => { if (event.pointerType !== "touch" && !event.currentTarget.contains(document.activeElement)) setActive(null); }}>
      {weekdays.map((day, i) => <button key={day} type="button" className="music-day-column flex min-h-40 min-w-0 flex-1 flex-col items-stretch justify-end gap-3 rounded-md text-center" data-active={active === i || undefined} onPointerEnter={event => { if (event.pointerType !== "touch") setActive(i); }} onBlur={() => setActive(null)} onClick={() => setActive(i)} onKeyDown={event => select(event, i)} aria-label={`${day}: ${number(data.stats.weekdays[i])} recorded plays`} aria-describedby={active === i ? tooltipId : undefined}>
        <span className="music-day-bar block" style={{ height: `${Math.max(2, data.stats.weekdays[i] / maximum * 120)}px` }} aria-hidden="true" /><span className="text-[12px] text-muted">{day.slice(0, 3)}</span>
      </button>)}
      {active !== null && <MusicChartTooltip analyticsBucket={weekdays[active]} id={tooltipId} title={weekdays[active]} rows={[{ key: weekdays[active], label: "Recorded plays", value: data.stats.weekdays[active] }]} x={(active + .5) / 7 * 100} preferTop secondary={share(data.stats.weekdays[active], data.stats.plays)} />}
    </div>
  </figure>;
}
