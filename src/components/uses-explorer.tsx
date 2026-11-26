"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { itemId, itemName, monthAt, monthIndex, readTimelineMonth, usesAt } from "@/lib/uses";
import { AnimatedDate } from "@/components/animated-date";
import { GearDetails } from "@/components/gear-details";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function UsesExplorer({ initialMonth }: { initialMonth: string }) {
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [selection, setSelection] = useState({ position: monthIndex(initialMonth), direction: 1 });

  useEffect(() => {
    const date = new Date();
    const now = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    setCurrentMonth(now);
    function readMonth() {
      const position = monthIndex(readTimelineMonth(new URLSearchParams(location.search), now));
      setSelection((previous) => ({ position, direction: position >= previous.position ? 1 : -1 }));
    }
    readMonth();
    window.addEventListener("popstate", readMonth);
    return () => window.removeEventListener("popstate", readMonth);
  }, []);

  const maximum = monthIndex(currentMonth);
  const month = monthAt(selection.position);
  const selectedYear = Number(month.slice(0, 4));
  const currentYear = Number(currentMonth.slice(0, 4));
  const monthLabel = new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  function selectPosition(next: number, commit = false) {
    const position = Math.max(0, Math.min(maximum, next));
    setSelection((previous) => previous.position === position ? previous : { position, direction: position > previous.position ? 1 : -1 });
    if (commit) {
      const url = new URL(location.href);
      const selected = monthAt(position);
      url.searchParams.delete("year");
      if (selected === currentMonth) url.searchParams.delete("month");
      else url.searchParams.set("month", selected);
      if (url.href !== location.href) history.pushState(null, "", url);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const step = event.shiftKey ? 12 : 1;
    const delta: Record<string, number> = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step, PageUp: 12, PageDown: -12 };
    if (event.key === "Home" || event.key === "End" || event.key in delta) {
      event.preventDefault();
      selectPosition(event.key === "Home" ? 0 : event.key === "End" ? maximum : selection.position + delta[event.key]);
    }
  }

  const inventory = useMemo(() => usesAt(month), [month]);
  const changes = useMemo(() => usesAt(selectedYear).changes, [selectedYear]);
  const tickYears = Array.from(new Set([2010, 2014, 2018, 2022, currentYear])).filter((tick) => tick <= currentYear).sort((a, b) => a - b);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-3">
          <h1 className="page-title">What I <em>use</em></h1>
          <p className="max-w-[34ch] text-[19px] leading-[1.25] text-pretty text-muted">Every piece of gear since 2010. Drag through time.</p>
        </div>
        <AnimatedDate month={month} direction={selection.direction} />
      </div>

      <div className="panel flex flex-col gap-2 rounded-[20px] px-6 py-5">
        <label className="sr-only" htmlFor="gear-date">Month</label>
        <p id="timeline-help" className="sr-only">Drag freely through months. Arrow keys move one month; Shift and arrow keys move one year.</p>
        <input id="gear-date" type="range" min={0} max={maximum} step="any" value={selection.position} aria-valuetext={`Gear at the end of ${monthLabel}`} aria-describedby="timeline-help" className="m-0 h-6 w-full" onKeyDown={onKeyDown} onChange={(event) => selectPosition(Number(event.target.value))} onPointerUp={(event) => selectPosition(Number(event.currentTarget.value), true)} onPointerCancel={(event) => selectPosition(Number(event.currentTarget.value), true)} onKeyUp={(event) => selectPosition(Number(event.currentTarget.value), true)} onBlur={(event) => selectPosition(Number(event.currentTarget.value), true)} />
        <div className="relative mx-1 h-5 text-[13px] text-muted tabular-nums">
          {tickYears.map((tick) => {
            const position = tick === currentYear ? maximum : (tick - 2010) * 12;
            return <button key={tick} type="button" className="absolute -translate-x-1/2 hover:text-accent first:translate-x-0 last:-translate-x-full" style={{ left: `${position / Math.max(maximum, 1) * 100}%` }} onClick={() => selectPosition(position, true)} aria-label={`Show gear in ${tick === currentYear ? currentMonth : `${tick}-01`}`}>{tick}</button>;
          })}
        </div>
      </div>

      <section aria-label={`Equipment in ${monthLabel}`} className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-[14px]">
        {inventory.categories.map((category) => (
          <article key={category.key} className="panel flex min-h-[120px] flex-col gap-[14px] rounded-[20px] px-[22px] py-5">
            <div className="eyebrow flex items-baseline justify-between">
              <h2>{category.label}</h2><span aria-label={`${category.items.length} items`}>{category.items.length ? String(category.items.length).padStart(2, "0") : ""}</span>
            </div>
            {category.items.length ? category.items.map((item) => (
              <div key={item.id} className="flex flex-col gap-[3px]">
                <div className="flex flex-wrap items-center gap-2">
                  <GearDetails key={`${item.id}:${month}`} item={item.details} heading>{item.name}</GearDetails>
                  {item.isNew && <span className="rounded-full bg-accent px-2 py-[3px] text-[11px] leading-none font-semibold tracking-[.08em] text-background uppercase">new</span>}
                </div>
                {item.spec && <p className="text-[14px] leading-[1.35] text-muted">{item.spec}</p>}
              </div>
            )) : <p className="font-display text-[22px] text-muted italic">nothing yet</p>}
          </article>
        ))}
      </section>

      <section className="panel flex flex-col gap-[14px] rounded-[20px] p-6" aria-labelledby="changes-title">
        <h2 id="changes-title" className="eyebrow">Changes in {selectedYear}</h2>
        <p className="sr-only" role="status">Showing {inventory.categories.reduce((sum, category) => sum + category.items.length, 0)} items in {monthLabel} and {changes.length} changes in {selectedYear}.</p>
        {changes.length ? <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-x-7 gap-y-[10px]">
          {changes.map((event) => <li key={`${event.date}:${event.op}:${itemId(event.item)}`} className={`grid grid-cols-[48px_18px_minmax(0,1fr)] items-baseline gap-2 text-base ${event.op === "+" ? "text-accent" : "text-muted"}`}>
            <time dateTime={event.date} className="text-[13px] text-muted">{months[Number(event.date.slice(5, 7)) - 1]}{event.date.length > 7 ? ` ${Number(event.date.slice(8, 10))}` : ""}</time>
            <span className="font-semibold" aria-label={event.op === "+" ? "Acquired" : "Retired"}>{event.op === "+" ? "+" : "−"}</span>
            <GearDetails key={`${itemId(event.item)}:${selectedYear}`} item={event.item} className={event.op === "-" ? "line-through" : ""}>{itemName(event.item)}</GearDetails>
          </li>)}
        </ul> : <p className="font-display text-2xl text-muted italic">A quiet year. Nothing in, nothing out.</p>}
      </section>
      <noscript><p className="text-muted">You’re viewing the latest gear. Enable JavaScript to explore earlier months.</p></noscript>
    </>
  );
}
