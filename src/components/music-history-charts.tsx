"use client";

import { useId, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { MusicDataset } from "@/lib/music/types";
import { nearestChartIndex } from "@/lib/music/chart-interaction";
import { MusicChartTooltip } from "./music-chart-tooltip";

const number = (value: number) => new Intl.NumberFormat("en-US").format(value);
const monthLabel = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}-01T12:00:00Z`));
const share = (plays: number, total: number) => `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(total ? plays / total * 100 : 0)}% of this period`;

export function ListeningChart({ data }: { data: MusicDataset }) {
  const id = useId().replaceAll(":", ""), tooltipId = `${id}-tooltip`, helpId = `${id}-help`;
  const [active, setActive] = useState<number | null>(null);
  const months = data.stats.months;
  const index = active === null || !months.length ? null : Math.min(active, months.length - 1);
  const selected = index === null ? null : months[index];
  const maximum = Math.max(1, ...months.map(m => m.plays));
  const x = (i: number) => months.length === 1 ? 300 : 12 + i / (months.length - 1) * 576;
  const y = (i: number) => 166 - months[i].plays / maximum * 142;
  const line = months.map((_, i) => `${i ? "L" : "M"} ${x(i)},${y(i)}`).join(" ");
  function inspect(event: PointerEvent<SVGSVGElement>) {
    if (!months.length) return;
    const box = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - box.left) / box.width * 600;
    setActive(nearestChartIndex((px - 12) / 576, months.length));
  }
  function key(event: KeyboardEvent<HTMLDivElement>) {
    if (!months.length) return;
    const current = index ?? months.length - 1;
    const next = event.key === "ArrowLeft" ? Math.max(0, current - 1) : event.key === "ArrowRight" ? Math.min(months.length - 1, current + 1) : event.key === "Home" ? 0 : event.key === "End" ? months.length - 1 : event.key === "Escape" ? null : undefined;
    if (next !== undefined) { event.preventDefault(); setActive(next); }
  }
  return <figure className="panel rounded-[24px] p-5 sm:p-7">
    <figcaption className="flex items-start justify-between gap-4"><div><p className="music-label">The listening curve</p><h2 className="mt-2 font-display text-[36px] leading-none">A little more <em className="text-accent">volume.</em></h2></div><span className="pt-1 text-[13px] text-muted">Recorded plays</span></figcaption>
    <div className="music-chart-surface mt-7" role="group" tabIndex={0} aria-label="Monthly listening chart" aria-describedby={`${helpId}${selected ? ` ${tooltipId}` : ""}`} onFocus={() => setActive(value => value ?? months.length - 1)} onBlur={() => setActive(null)} onKeyDown={key} onPointerLeave={event => { if (event.pointerType !== "touch" && document.activeElement !== event.currentTarget) setActive(null); }}>
      <p id={helpId} className="sr-only">Use Left and Right to explore months, Home and End to jump, and Escape to dismiss details.</p>
      <svg viewBox="0 0 600 190" role="img" aria-label={`Recorded listening by month. ${months.map(m => `${monthLabel(m.month)}: ${m.plays}`).join(". ")}`} className="w-full overflow-visible" onPointerMove={event => { if (event.pointerType !== "touch") inspect(event); }} onPointerDown={inspect}>
        <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop stopColor="var(--acc)" stopOpacity=".3" /><stop offset="1" stopColor="var(--acc)" stopOpacity="0" /></linearGradient></defs>
        {[24, 95, 166].map(value => <line key={value} x1="12" x2="588" y1={value} y2={value} stroke="var(--line)" strokeDasharray="3 6" />)}
        {line && <><path d={`${line} L ${x(months.length - 1)},180 L ${x(0)},180 Z`} fill={`url(#${id})`} /><path d={line} fill="none" stroke="var(--acc)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />{months.length <= 24 && months.map((m, i) => <circle key={m.month} cx={x(i)} cy={y(i)} r="3.5" fill="var(--bg)" stroke="var(--acc)" strokeWidth="2" />)}</>}
        {index !== null && <g aria-hidden="true"><line x1={x(index)} x2={x(index)} y1="12" y2="180" stroke="var(--acc)" strokeDasharray="3 5" opacity=".6" /><circle cx={x(index)} cy={y(index)} r="10" fill="var(--acc)" opacity=".15" /><circle cx={x(index)} cy={y(index)} r="5" fill="var(--bg)" stroke="var(--acc)" strokeWidth="2.5" /></g>}
      </svg>
      {selected && index !== null && <MusicChartTooltip id={tooltipId} title={monthLabel(selected.month)} rows={[{ key: selected.month, label: "Recorded plays", value: selected.plays }]} x={x(index) / 6} placement={y(index) < 95 ? "bottom" : "top"} secondary={share(selected.plays, data.stats.plays)} />}
    </div>
    <div className="mt-1 flex justify-between text-[13px] text-muted"><span>{months[0] ? monthLabel(months[0].month) : "History is on its way"}</span><span>{months.length > 1 ? monthLabel(months.at(-1)!.month) : ""}</span></div>
    <details className="mt-3 text-[13px] text-muted"><summary className="cursor-pointer">View monthly counts</summary><ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">{months.map(m => <li key={m.month} className="flex justify-between gap-2"><span>{monthLabel(m.month)}</span><span>{number(m.plays)}</span></li>)}</ul></details>
  </figure>;
}

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export function WeekdayChart({ data }: { data: MusicDataset }) {
  const [active, setActive] = useState<number | null>(null);
  const tooltipId = useId(), maximum = Math.max(1, ...data.stats.weekdays);
  const select = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "Escape") { event.preventDefault(); setActive(null); return; }
    const next = event.key === "ArrowLeft" ? (index + 6) % 7 : event.key === "ArrowRight" ? (index + 1) % 7 : event.key === "Home" ? 0 : event.key === "End" ? 6 : undefined;
    if (next !== undefined) { event.preventDefault(); event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus(); }
  };
  return <figure className="panel flex flex-col rounded-[24px] p-5 sm:p-7">
    <figcaption><p className="music-label">A weekly rhythm</p><h2 className="mt-2 font-display text-[36px] leading-none">Day by <em className="text-accent">day.</em></h2></figcaption>
    <div className="music-chart-surface mt-8 flex min-h-40 flex-1 items-end gap-3" role="group" aria-label="Listening by weekday" data-inspecting={active !== null || undefined} onPointerLeave={event => { if (event.pointerType !== "touch" && !event.currentTarget.contains(document.activeElement)) setActive(null); }}>
      {weekdays.map((day, i) => <button key={day} type="button" className="music-day-column flex min-h-40 min-w-0 flex-1 flex-col items-stretch justify-end gap-3 rounded-md text-center" data-active={active === i || undefined} onPointerEnter={() => setActive(i)} onFocus={() => setActive(i)} onBlur={() => setActive(null)} onClick={() => setActive(i)} onKeyDown={event => select(event, i)} aria-label={`${day}: ${number(data.stats.weekdays[i])} recorded plays`} aria-describedby={active === i ? tooltipId : undefined}>
        <span className="music-day-bar block" style={{ height: `${Math.max(2, data.stats.weekdays[i] / maximum * 120)}px` }} aria-hidden="true" /><span className="text-[12px] text-muted">{day.slice(0, 3)}</span>
      </button>)}
      {active !== null && <MusicChartTooltip id={tooltipId} title={weekdays[active]} rows={[{ key: weekdays[active], label: "Recorded plays", value: data.stats.weekdays[active] }]} x={(active + .5) / 7 * 100} secondary={share(data.stats.weekdays[active], data.stats.plays)} />}
    </div>
    <p className="mt-5 text-[13px] text-muted">Eastern Time.</p>
  </figure>;
}
