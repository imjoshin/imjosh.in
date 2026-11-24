"use client";

import { useEffect, useState } from "react";
import { itemId, itemName, parseYear, usesAt } from "@/lib/uses";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function UsesExplorer({ initialYear }: { initialYear: number }) {
  const [currentYear, setCurrentYear] = useState(initialYear);
  const [year, setYear] = useState(initialYear);

  useEffect(() => {
    const now = new Date().getFullYear();
    setCurrentYear(now);
    function readYear() { setYear(parseYear(new URLSearchParams(location.search).get("year"), now)); }
    readYear();
    window.addEventListener("popstate", readYear);
    return () => window.removeEventListener("popstate", readYear);
  }, []);

  function selectYear(next: number, commit = false) {
    setYear(next);
    if (commit) {
      const url = new URL(location.href);
      if (next === currentYear) url.searchParams.delete("year");
      else url.searchParams.set("year", String(next));
      if (url.href !== location.href) history.pushState(null, "", url);
    }
  }

  const inventory = usesAt(year);
  const tickYears = Array.from(new Set([2010, 2014, 2018, 2022, currentYear])).filter((tick) => tick <= currentYear).sort((a, b) => a - b);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-3">
          <h1 className="page-title">What I <em>use</em></h1>
          <p className="max-w-[34ch] text-[19px] leading-[1.25] text-pretty text-muted">Every piece of gear since 2010. Drag through time.</p>
        </div>
        <output htmlFor="year" className="font-display text-[clamp(80px,12vw,168px)] leading-[.8] tracking-[-.03em] tabular-nums">{year}</output>
      </div>

      <div className="panel flex flex-col gap-2 rounded-[20px] px-6 py-5">
        <label className="sr-only" htmlFor="year">Year</label>
        <input id="year" type="range" min={2010} max={currentYear} step={1} value={year} aria-valuetext={`Gear at the end of ${year}`} className="m-0 h-6 w-full" onChange={(event) => selectYear(Number(event.target.value))} onPointerUp={(event) => selectYear(Number(event.currentTarget.value), true)} onKeyUp={(event) => selectYear(Number(event.currentTarget.value), true)} onBlur={(event) => selectYear(Number(event.currentTarget.value), true)} />
        <div className="relative mx-1 h-5 text-[13px] text-muted tabular-nums">
          {tickYears.map((tick) => <button key={tick} type="button" className="absolute -translate-x-1/2 hover:text-accent first:translate-x-0 last:-translate-x-full" style={{ left: `${(tick - 2010) / (currentYear - 2010) * 100}%` }} onClick={() => selectYear(tick, true)} aria-label={`Show gear in ${tick}`}>{tick}</button>)}
        </div>
      </div>

      <section aria-label={`Equipment in ${year}`} className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-[14px]">
        {inventory.categories.map((category) => (
          <article key={category.key} className="panel flex min-h-[120px] flex-col gap-[14px] rounded-[20px] px-[22px] py-5">
            <div className="eyebrow flex items-baseline justify-between">
              <h2>{category.label}</h2><span aria-label={`${category.items.length} items`}>{category.items.length ? String(category.items.length).padStart(2, "0") : ""}</span>
            </div>
            {category.items.length ? category.items.map((item) => (
              <div key={item.id} className="flex flex-col gap-[3px]">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[18px] leading-[1.2] font-medium">{item.name}</h3>
                  {item.isNew && <span className="rounded-full bg-accent px-2 py-[3px] text-[11px] leading-none font-semibold tracking-[.08em] text-background uppercase">new</span>}
                </div>
                {item.spec && <p className="text-[14px] leading-[1.35] text-muted">{item.spec}</p>}
              </div>
            )) : <p className="font-display text-[22px] text-muted italic">nothing yet</p>}
          </article>
        ))}
      </section>

      <section className="panel flex flex-col gap-[14px] rounded-[20px] p-6" aria-labelledby="changes-title">
        <h2 id="changes-title" className="eyebrow">Changes in {year}</h2>
        <p className="sr-only" role="status">Showing {inventory.categories.reduce((sum, category) => sum + category.items.length, 0)} items and {inventory.changes.length} changes in {year}.</p>
        {inventory.changes.length ? <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-x-7 gap-y-[10px]">
          {inventory.changes.map((event) => <li key={`${event.date}:${event.op}:${itemId(event.item)}`} className={`grid grid-cols-[40px_18px_minmax(0,1fr)] items-baseline gap-2 text-base ${event.op === "+" ? "text-accent" : "text-muted"}`}>
            <span className="text-[13px] text-muted">{months[Number(event.date.slice(5)) - 1]}</span>
            <span className="font-semibold" aria-label={event.op === "+" ? "Acquired" : "Retired"}>{event.op === "+" ? "+" : "−"}</span>
            <span className={event.op === "-" ? "line-through" : ""}>{itemName(event.item)}</span>
          </li>)}
        </ul> : <p className="font-display text-2xl text-muted italic">A quiet year. Nothing in, nothing out.</p>}
      </section>
      <noscript><p className="text-muted">You’re viewing the latest gear. Enable JavaScript to explore earlier years.</p></noscript>
    </>
  );
}
