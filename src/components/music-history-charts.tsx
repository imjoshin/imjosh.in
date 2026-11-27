"use client";

import { useId, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { MusicDataset } from "@/lib/music/types";
import { chartPointAt, musicLinePath } from "@/lib/music/chart-interaction";
import { listeningChartBuckets } from "@/lib/music/listening-chart";
import { averageListeningTime, formatListeningTime } from "@/lib/music/listening-time";
import { hasMissingMusicHistory, musicHistoryGap } from "@/lib/music/history-gap";
import { MusicChartTooltip } from "./music-chart-tooltip";
import { MusicHistoryGapBand, MusicHistoryGapNotice } from "./music-history-gap";
import { useMusicLineMotion, useMusicPresence } from "./music-motion";
import { useMusicChartInteraction } from "./use-music-chart-interaction";

const number = (value: number) => new Intl.NumberFormat("en-US").format(value);
const monthLabel = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}-01T12:00:00Z`));
const dayLabel = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
const share = (plays: number, total: number) => `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(total ? plays / total * 100 : 0)}% of this period`;
const dateTime = (date: string) => Date.parse(`${date.length === 7 ? `${date}-01` : date}T12:00:00Z`) / 86400000;

/** Keep sparse periods on whole-play ticks and round larger scales to readable counts. */
function playCountScale(peak: number) {
  const roughStep = Math.max(1, peak / 3), magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const step = [1, 2, 5, 10].find(value => value * magnitude >= roughStep)! * magnitude;
  const maximum = Math.max(step, Math.ceil(peak / step) * step);
  return { maximum, ticks: Array.from({ length: Math.round(maximum / step) + 1 }, (_, i) => i * step) };
}

function PlayCountAxis({ scale, inset = 0 }: { scale: ReturnType<typeof playCountScale>; inset?: number }) {
  return <div aria-hidden="true" className="relative self-stretch text-right text-[12px] leading-none text-muted tabular-nums" style={{ width: `${number(scale.maximum).length}ch` }}>
    <div className="absolute inset-x-0" style={{ top: `${inset}%`, bottom: `${inset}%` }}>{scale.ticks.map(value => <span key={value} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - value / scale.maximum) * 100}%` }}>{number(value)}</span>)}</div>
  </div>;
}

export function ListeningChart({ data }: { data: MusicDataset }) {
  const id = useId().replaceAll(":", ""), tooltipId = `${id}-tooltip`, helpId = `${id}-help`;
  const [active, setActive] = useState<string | null>(null);
  const daily = data.period === "30d";
  const buckets = listeningChartBuckets(data);
  const gap = musicHistoryGap(buckets.map(bucket => bucket.key));
  const label = daily ? dayLabel : monthLabel;
  const index = active === null || !buckets.length ? null : Math.max(0, buckets.findIndex(bucket => bucket.key === active));
  const selected = index === null ? null : buckets[index];
  const interaction = useMusicChartInteraction(active !== null, () => setActive(null), inspect);
  const scale = playCountScale(Math.max(0, ...buckets.map(bucket => bucket.plays)));
  const points = useMusicLineMotion(buckets.map((bucket, i) => ({ t: dateTime(bucket.key), x: buckets.length === 1 ? 300 : 12 + i / (buckets.length - 1) * 576, y: 166 - bucket.plays / scale.maximum * 142 })), 166);
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
    <div className="mt-7 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3">
    <PlayCountAxis scale={scale} inset={24 / 190 * 100} />
    <div ref={interaction.ref} className="music-chart-surface" role="group" tabIndex={0} aria-label={`${daily ? "Daily" : "Monthly"} listening chart, recorded plays`} aria-describedby={`${helpId}${selected ? ` ${tooltipId}` : ""}`} onBlur={() => setActive(null)} onKeyDown={key} onPointerLeave={event => { if (event.pointerType !== "touch" && document.activeElement !== event.currentTarget) setActive(null); }}>
      <p id={helpId} className="sr-only">Use Left and Right to explore {daily ? "days" : "months"}, Home and End to jump, and Escape to dismiss details.</p>
      <svg viewBox="0 0 600 190" preserveAspectRatio="none" role="img" aria-label={`Recorded listening by ${daily ? "day" : "month"}. ${buckets.map(bucket => `${label(bucket.key)}: ${bucket.plays}`).join(". ")}`} className="block min-h-40 w-full overflow-visible" onPointerMove={interaction.onPointerMove} onPointerDown={interaction.onPointerDown} onPointerUp={interaction.onPointerUp} onPointerCancel={interaction.onPointerCancel}>
        <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop stopColor="var(--acc)" stopOpacity=".3" /><stop offset="1" stopColor="var(--acc)" stopOpacity="0" /></linearGradient></defs>
        <MusicHistoryGapBand range={gap} left={12} right={588} top={12} bottom={180} active={!!selected && hasMissingMusicHistory(selected.key)} />
        <g aria-hidden="true"><line x1="12" x2="12" y1="24" y2="166" stroke="var(--line)" />{scale.ticks.map(value => <line key={value} x1="12" x2="588" y1={166 - value / scale.maximum * 142} y2={166 - value / scale.maximum * 142} stroke="var(--line)" strokeDasharray={value ? "3 6" : undefined} />)}</g>
        {line && <><path d={`${line} L ${points.at(-1)!.x},166 L ${points[0].x},166 Z`} fill={`url(#${id})`} /><path d={line} fill="none" stroke="var(--acc)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />{dots.map(({ item, phase }) => <circle key={item.key} className="music-point" data-phase={phase} cx={point(item.key).x} cy={point(item.key).y} r="3.5" fill="var(--bg)" stroke="var(--acc)" strokeWidth="2" />)}</>}
        {selectedPoint && <g aria-hidden="true"><line x1={selectedPoint.x} x2={selectedPoint.x} y1="12" y2="180" stroke="var(--acc)" strokeDasharray="3 5" opacity=".6" /><circle cx={selectedPoint.x} cy={selectedPoint.y} r="10" fill="var(--acc)" opacity=".15" /><circle cx={selectedPoint.x} cy={selectedPoint.y} r="5" fill="var(--bg)" stroke="var(--acc)" strokeWidth="2.5" /></g>}
      </svg>
      {selected && selectedPoint && <MusicChartTooltip analyticsBucket={selected.key} id={tooltipId} title={label(selected.key)} rows={[{ key: selected.key, label: "Recorded plays", value: selected.plays }]} x={selectedPoint.x / 6} preferTop secondary={share(selected.plays, data.stats.plays)} notice={hasMissingMusicHistory(selected.key) ? <MusicHistoryGapNotice /> : undefined} />}
    </div>
    <div className="col-start-2 mt-1 flex justify-between text-[13px] text-muted"><span>{buckets[0] ? label(buckets[0].key) : daily ? "Daily history is on its way" : "History is on its way"}</span><span>{buckets.length > 1 ? label(buckets.at(-1)!.key) : ""}</span></div>
    </div>
  </figure>;
}

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
type TimeSelection = { index: number; period: string; method: "hover" | "keyboard" | "touch" | "click" };
const hourLabel = (hour: number) => `${hour % 12 || 12} ${hour < 12 ? "AM" : "PM"}`;
const hourRange = (hour: number) => `${hourLabel(hour)} to ${hourLabel((hour + 1) % 24)}`;

function AverageTimeTooltip({ data, by, index, id, title, x = 50, preferTop = false }: { data: MusicDataset; by: "weekday" | "hour"; index: number; id: string; title: string; x?: number; preferTop?: boolean }) {
  const bucket = averageListeningTime(data, by, index);
  const days = `${number(bucket.days)} ${by === "weekday" ? `${weekdays[index]}${bucket.days === 1 ? "" : "s"}` : bucket.days === 1 ? "day" : "days"}`;
  return <MusicChartTooltip analyticsBucket={by === "hour" ? String(index).padStart(2, "0") : weekdays[index]} id={id} title={title} x={x} preferTop={preferTop}
    rows={[{ key: "average", label: "Average listening", value: bucket.average ?? 0, formattedValue: formatListeningTime(bucket.average) }, ...(bucket.average === null ? [] : [{ key: "total", label: "Measured total", value: bucket.msPlayed, formattedValue: formatListeningTime(bucket.msPlayed) }])]}
    secondary={`${days} in this period. ${number(bucket.durationKnown)} of ${number(bucket.plays)} plays have measured duration.`} />;
}

export function WeekdayChart({ data }: { data: MusicDataset }) {
  const [selection, setSelection] = useState<TimeSelection | null>(null);
  const active = selection?.period === data.period ? selection.index : null;
  const choose = (index: number, method: TimeSelection["method"]) => setSelection({ index, period: data.period, method });
  const interaction = useMusicChartInteraction<HTMLDivElement>(active !== null, () => setSelection(null), event => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("[data-weekday]") : null;
    if (button) choose(Number(button.dataset.weekday), event.pointerType === "touch" ? "touch" : event.type === "pointerdown" ? "click" : "hover");
  });
  const values = weekdays.map((_, i) => averageListeningTime(data, "weekday", i).average);
  const maximum = Math.max(0, ...values.map(value => value ?? 0));
  const unit = maximum > 0 && maximum < 60000 ? 1000 : 60000;
  const tooltipId = useId(), scale = playCountScale(maximum / unit);
  const select = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "Escape") { event.preventDefault(); setSelection(null); return; }
    const next = event.key === "ArrowLeft" ? (index + 6) % 7 : event.key === "ArrowRight" ? (index + 1) % 7 : event.key === "Home" ? 0 : event.key === "End" ? 6 : undefined;
    if (next !== undefined) { event.preventDefault(); event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus(); choose(next, "keyboard"); }
  };
  return <figure data-analytics-section="weekday" data-analytics-chart="weekday" data-analytics-metric="average_listening_time" data-analytics-period={data.period} className="music-history-chart panel flex flex-col rounded-[24px] p-5 sm:p-7">
    <figcaption className="flex flex-wrap items-start justify-between gap-4"><div><p className="music-label">A weekly rhythm</p><h2 className="mt-2 font-display text-[36px] leading-none">Day by <em className="text-accent">day.</em></h2></div><span className="pt-1 text-[13px] text-muted">Average {unit === 1000 ? "seconds" : "minutes"} per day</span></figcaption>
    <div className="mt-8 grid flex-1 grid-cols-[max-content_minmax(0,1fr)] items-end gap-x-3">
    <div className="mb-[30px] flex h-[120px]"><PlayCountAxis scale={scale} /></div>
    <div ref={interaction.ref} className="music-chart-surface flex min-h-40 items-end gap-3" role="group" aria-label="Average measured listening time by weekday" data-analytics-method={active !== null ? selection?.method : undefined} data-inspecting={active !== null || undefined} onPointerMove={interaction.onPointerMove} onPointerDown={interaction.onPointerDown} onPointerUp={interaction.onPointerUp} onPointerCancel={interaction.onPointerCancel} onPointerLeave={event => { if (event.pointerType !== "touch" && !event.currentTarget.contains(document.activeElement)) setSelection(null); }}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-[30px] h-[120px] border-l border-[var(--line)]">{scale.ticks.map(value => <span key={value} className={`absolute inset-x-0 border-t border-[var(--line)] ${value ? "border-dashed" : ""}`} style={{ top: `${(1 - value / scale.maximum) * 100}%` }} />)}</div>
      {weekdays.map((day, i) => <button key={day} data-weekday={i} type="button" className="music-day-column relative flex h-40 min-w-0 flex-1 flex-col items-stretch justify-end gap-3 rounded-md text-center" data-active={active === i || undefined} onBlur={() => setSelection(null)} onClick={event => { if (event.detail === 0) choose(i, "keyboard"); }} onKeyDown={event => select(event, i)} aria-label={`${day}: ${formatListeningTime(values[i])} average measured listening time`} aria-describedby={active === i ? tooltipId : undefined}>
        {values[i] === null ? <span aria-hidden="true" className="text-[11px] text-muted">n/a</span> : <span className="music-day-bar block" style={{ height: `${values[i] / unit / scale.maximum * 120}px`, minHeight: 0 }} aria-hidden="true" />}<span className="text-[12px] leading-[18px] text-muted">{day.slice(0, 3)}</span>
      </button>)}
      {active !== null && <AverageTimeTooltip data={data} by="weekday" index={active} id={tooltipId} title={weekdays[active]} x={(active + .5) / 7 * 100} preferTop />}
    </div>
    </div>
  </figure>;
}

export function HourlyChart({ data }: { data: MusicDataset }) {
  const [selection, setSelection] = useState<TimeSelection | null>(null);
  const active = selection?.period === data.period ? selection.index : null;
  const choose = (index: number, method: TimeSelection["method"]) => setSelection({ index, period: data.period, method });
  const interaction = useMusicChartInteraction<HTMLDivElement>(active !== null, () => setSelection(null), event => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("[data-hour]") : null;
    if (button) choose(Number(button.dataset.hour), event.pointerType === "touch" ? "touch" : event.type === "pointerdown" ? "click" : "hover");
  });
  const tooltipId = useId(), helpId = useId();
  const values = Array.from({ length: 24 }, (_, i) => averageListeningTime(data, "hour", i).average);
  const peak = Math.max(0, ...values.map(value => value ?? 0));
  function select(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "ArrowUp" ? (index + 23) % 24 : event.key === "ArrowDown" ? (index + 1) % 24 : event.key === "Home" ? 0 : event.key === "End" ? 23 : event.key === "Escape" ? null : undefined;
    if (next === undefined) return;
    event.preventDefault();
    if (next === null) { setSelection(null); return; }
    event.currentTarget.closest("[data-hourly-rows]")?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
    choose(next, "keyboard");
  }
  return <figure data-analytics-section="hourly" data-analytics-chart="hourly" data-analytics-metric="average_listening_time" data-analytics-period={data.period} className="music-history-chart music-hourly-chart panel flex min-w-0 flex-col rounded-[24px] p-5 sm:p-7 lg:col-start-2 lg:row-start-1">
    <figcaption><h2 className="font-display text-[36px] leading-none">Around the <em className="text-accent">clock.</em></h2><p className="mt-3 text-[13px] text-muted">Average listening time in each hour, per day.</p></figcaption>
    <p id={helpId} className="sr-only">Use Up and Down to explore hours, Home and End to jump, and Escape to dismiss details.</p>
    <div ref={interaction.ref} data-hourly-rows className="music-chart-surface music-hourly-rows mt-5" role="group" aria-label="Average measured listening time by hour" aria-describedby={helpId} data-analytics-method={active !== null ? selection?.method : undefined} data-inspecting={active !== null || undefined} onPointerMove={interaction.onPointerMove} onPointerDown={interaction.onPointerDown} onPointerUp={interaction.onPointerUp} onPointerCancel={interaction.onPointerCancel} onPointerLeave={event => { if (event.pointerType !== "touch" && !event.currentTarget.contains(document.activeElement)) setSelection(null); }}>
      {values.map((value, i) => <div key={i} className="relative flex min-w-0 flex-col justify-center"><button data-hour={i} type="button" className="music-hour-row" data-active={active === i || undefined} data-peak={peak > 0 && value === peak || undefined} tabIndex={i === (active ?? 0) ? 0 : -1} onBlur={() => setSelection(null)} onClick={event => { if (event.detail === 0) choose(i, "keyboard"); }} onKeyDown={event => select(event, i)} aria-label={`${hourRange(i)}: ${formatListeningTime(value)} average measured listening time per day`} aria-describedby={active === i ? tooltipId : undefined}>
        <span className="music-hour-label">{hourLabel(i)}</span><span className="music-hour-track" aria-hidden="true"><span className="music-hour-bar" style={{ width: `${peak && value !== null ? value / peak * 100 : 0}%` }} /></span><span className="text-right text-[12px] text-muted tabular-nums">{value === null ? <><span aria-hidden="true">n/a</span><span className="sr-only">Unavailable</span></> : formatListeningTime(value)}</span>
      </button>{active === i && <AverageTimeTooltip data={data} by="hour" index={i} id={tooltipId} title={hourRange(i)} />}</div>)}
    </div>
  </figure>;
}
