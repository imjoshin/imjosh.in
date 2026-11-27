"use client";

import { useRef, useState, type KeyboardEvent } from "react";

const presets = [["30d", "Last 30 days"], ["365d", "Last year"], ["all", "All time"]] as const;

export function MusicPeriodFilter({ period, periods, onChange }: { period: string; periods: string[]; onChange: (period: string, replace?: boolean) => void }) {
  const years = periods.filter(value => /^\d{4}$/.test(value)).sort((a, b) => Number(a) - Number(b));
  const [rememberedYear, setRememberedYear] = useState(years.at(-1));
  const [selection, setSelection] = useState<{ year: string; value: number } | null>(null);
  const scrubbing = useRef(false);
  const active = years.includes(period);
  const year = active ? period : years.includes(rememberedYear || "") ? rememberedYear! : years.at(-1);
  const index = year ? years.indexOf(year) : 0;
  const maximum = Math.max(0, years.length - 1);
  const value = selection && selection.year === year ? selection.value : index;
  const position = value / Math.max(1, maximum);

  function selectYear(position: number) {
    const value = Math.max(0, Math.min(maximum, position));
    const next = years[Math.round(value)];
    if (!next) return;
    setSelection({ year: next, value });
    setRememberedYear(next);
    onChange(next, scrubbing.current);
    if (next !== period) scrubbing.current = true;
  }
  function finishScrubbing() { scrubbing.current = false; }
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const delta: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: 1, ArrowDown: -1, PageUp: 1, PageDown: -1 };
    if (event.key === "Home" || event.key === "End" || event.key in delta) {
      event.preventDefault();
      selectYear(event.key === "Home" ? 0 : event.key === "End" ? maximum : index + delta[event.key]);
    }
  }

  return <>
    <div className="music-period-presets" role="group" aria-label="Listening history presets">{presets.map(([value, label]) => <button key={value} type="button" aria-pressed={period === value} onClick={() => { setRememberedYear(year); finishScrubbing(); onChange(value); }}>{label}</button>)}</div>
    {year && <div className="music-year-filter" data-active={active}>
      <input id="music-history-year" className="music-year-slider" type="range" min={0} max={maximum} step="any" value={value} aria-label="Listening history year" aria-valuetext={year} onPointerDown={() => selectYear(value)} onChange={event => selectYear(Number(event.currentTarget.value))} onPointerUp={finishScrubbing} onPointerCancel={finishScrubbing} onKeyDown={onKeyDown} onKeyUp={finishScrubbing} onBlur={finishScrubbing} />
      <div aria-hidden="true" className="music-year-labels relative flex justify-between text-[12px] tabular-nums text-muted">
        <span data-adjacent={active && index === 1 || undefined} className={active && index === 0 ? "text-white" : undefined}>{years[0]}</span>
        {active && index > 0 && index < years.length - 1 && <span className="absolute -translate-x-1/2 text-white" style={{ left: `calc(${position * 100}% + ${9 - position * 18}px)` }}>{year}</span>}
        <span data-adjacent={active && index === years.length - 2 || undefined} className={active && index === years.length - 1 ? "text-white" : undefined}>{years.length > 1 ? years.at(-1) : ""}</span>
      </div>
    </div>}
  </>;
}
