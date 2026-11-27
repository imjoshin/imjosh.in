"use client";

import { useRef, useState } from "react";

const presets = [["30d", "Last 30 days"], ["365d", "Last year"], ["all", "All time"]] as const;

export function MusicPeriodFilter({ period, periods, onChange }: { period: string; periods: string[]; onChange: (period: string, replace?: boolean) => void }) {
  const years = periods.filter(value => /^\d{4}$/.test(value)).sort((a, b) => Number(a) - Number(b));
  const [rememberedYear, setRememberedYear] = useState(years.at(-1));
  const scrubbing = useRef(false);
  const active = years.includes(period);
  const year = active ? period : years.includes(rememberedYear || "") ? rememberedYear! : years.at(-1);
  const index = year ? years.indexOf(year) : 0;
  const position = index / Math.max(1, years.length - 1);

  function selectYear(position: number) {
    const next = years[position];
    if (!next) return;
    setRememberedYear(next);
    onChange(next, scrubbing.current);
    if (next !== period) scrubbing.current = true;
  }
  function finishScrubbing() { scrubbing.current = false; }

  return <>
    <div className="music-period-presets" role="group" aria-label="Listening history presets">{presets.map(([value, label]) => <button key={value} type="button" aria-pressed={period === value} onClick={() => { setRememberedYear(year); finishScrubbing(); onChange(value); }}>{label}</button>)}</div>
    {year && <div className="music-year-filter" data-active={active}>
      <input id="music-history-year" className="music-year-slider" type="range" min={0} max={Math.max(0, years.length - 1)} step={1} value={index} aria-label="Listening history year" aria-valuetext={year} onPointerDown={() => selectYear(index)} onChange={event => selectYear(Number(event.currentTarget.value))} onPointerUp={finishScrubbing} onPointerCancel={finishScrubbing} onKeyDown={event => { if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(event.key) && !active) selectYear(index); }} onKeyUp={finishScrubbing} onBlur={finishScrubbing} />
      <div aria-hidden="true" className="music-year-labels relative flex justify-between text-[12px] tabular-nums text-muted">
        <span data-adjacent={index === 1 || undefined} className={index === 0 ? "text-white" : undefined}>{years[0]}</span>
        {index > 0 && index < years.length - 1 && <span className="absolute -translate-x-1/2 text-white" style={{ left: `calc(${position * 100}% + ${9 - position * 18}px)` }}>{year}</span>}
        <span data-adjacent={index === years.length - 2 || undefined} className={index === years.length - 1 ? "text-white" : undefined}>{years.length > 1 ? years.at(-1) : ""}</span>
      </div>
    </div>}
  </>;
}
