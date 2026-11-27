"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import type { MusicArtistHistoryDataset, MusicHistoryArtist } from "@/lib/music/types";
import { artistSeasonColor } from "@/lib/music/artist-history-colors";
import { spotifyImage } from "@/lib/music/entity-links";
import { musicPlaceholderStyle } from "@/lib/music/placeholder";
import { MusicLink, useDismissMusicHover } from "./music-entity-link";

const groupLabels = { "all-time": "All time favorites", recent: "Recent interests", past: "A moment in time" };
const number = new Intl.NumberFormat("en-US");
interface Inspection { artist: MusicHistoryArtist; index: number; anchor: HTMLElement }

function ArtistHistoryYears({ buckets }: { buckets: MusicArtistHistoryDataset["buckets"] }) {
  const axis = useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState({ width: 0, labelWidth: 0 });
  const years = buckets.reduce<{ year: string; start: number; count: number }[]>((items, bucket, index) => {
    const year = bucket.key.split("-")[0];
    if (items.at(-1)?.year === year) items[items.length - 1].count++;
    else items.push({ year, start: index, count: 1 });
    return items;
  }, []);
  useLayoutEffect(() => {
    const element = axis.current, label = element?.firstElementChild;
    if (!element || !label) return;
    const measure = () => {
      const next = { width: element.getBoundingClientRect().width, labelWidth: label.getBoundingClientRect().width };
      setLayout(old => old.width === next.width && old.labelWidth === next.labelWidth ? old : next);
    };
    measure();
    const observer = new ResizeObserver(measure); observer.observe(element); observer.observe(label);
    return () => observer.disconnect();
  }, [buckets]);
  const gap = layout.labelWidth + 18;
  const stride = layout.width ? Math.max(1, Math.ceil(gap / (layout.width * 4 / buckets.length))) : Infinity;
  const position = (year: typeof years[number]) => (year.start + year.count / 2) / buckets.length;
  const center = (year: typeof years[number]) => Math.max(layout.labelWidth / 2, Math.min(layout.width - layout.labelWidth / 2, position(year) * layout.width));
  return <div ref={axis} className="music-artist-years">{years.map((year, index) => {
    const visible = index === 0 || index === years.length - 1 || index % stride === 0 && center(years[years.length - 1]) - center(year) >= gap;
    return <span key={year.year} hidden={!visible} style={{ "--year-position": `${position(year) * 100}%` } as CSSProperties}>{year.year}</span>;
  })}</div>;
}

function ArtistHistoryTooltip({ active, data, id }: { active: Inspection; data: MusicArtistHistoryDataset; id: string }) {
  const popup = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ left: 12, top: 12, ready: false });
  const bucket = data.buckets[active.index], plays = active.artist.seasonPlays[active.index] || 0;
  const image = spotifyImage(active.artist.image);
  useLayoutEffect(() => {
    const element = popup.current;
    if (!element) return;
    const place = () => {
      const anchor = active.anchor.getBoundingClientRect(), bounds = element.getBoundingClientRect(), viewport = window.visualViewport;
      const offsetX = viewport?.offsetLeft || 0, offsetY = viewport?.offsetTop || 0;
      const right = offsetX + (viewport?.width || innerWidth) - 12, bottom = offsetY + (viewport?.height || innerHeight) - 12;
      const top = Math.max(offsetY + 12, (document.querySelector(".site-header")?.getBoundingClientRect().bottom || 0) + 12);
      const above = anchor.top - bounds.height - 10;
      const next = { left: Math.max(offsetX + 12, Math.min(anchor.left + anchor.width / 2 - bounds.width / 2, right - bounds.width)), top: Math.max(top, Math.min(above >= top ? above : anchor.bottom + 10, bottom - bounds.height)), ready: true };
      setPosition(old => old.left === next.left && old.top === next.top && old.ready ? old : next);
    };
    place();
    const observer = new ResizeObserver(place); observer.observe(element);
    addEventListener("scroll", place, true); addEventListener("resize", place);
    window.visualViewport?.addEventListener("resize", place); window.visualViewport?.addEventListener("scroll", place);
    return () => { observer.disconnect(); removeEventListener("scroll", place, true); removeEventListener("resize", place); window.visualViewport?.removeEventListener("resize", place); window.visualViewport?.removeEventListener("scroll", place); };
  }, [active]);
  return createPortal(<div ref={popup} id={id} role="tooltip" aria-live="polite" aria-atomic="true" className="music-artist-tooltip" data-ready={position.ready || undefined} style={{ left: position.left, top: position.top }}>
    <div className="flex items-center gap-3">
      {image ? <img src={image} alt="" width="40" height="40" className="size-10 shrink-0 rounded-full object-cover" /> : <span className="music-cover size-10 shrink-0 rounded-full" style={musicPlaceholderStyle(active.artist.name)} aria-hidden="true">{active.artist.name.slice(0, 1)}</span>}
      <div className="min-w-0"><strong className="block truncate text-[14px] font-semibold leading-5">{active.artist.name}</strong><p className="mt-1 whitespace-nowrap text-[12px] leading-4 text-muted">{bucket.label}</p></div>
    </div>
    {bucket.plays ? <dl className="mt-3 grid grid-cols-2 gap-4"><div><dt>Recorded plays</dt><dd>{number.format(plays)}</dd></div><div><dt>Share of the season</dt><dd>{(plays / bucket.plays * 100).toFixed(1)}%</dd></div></dl> : <p className="mt-3 text-[12px] text-muted">No recorded history for this season.</p>}
  </div>, document.body);
}

export function MusicArtistHistory({ data }: { data: MusicArtistHistoryDataset | null }) {
  return data?.buckets.length && data.groups.some(group => group.artists.length) ? <ArtistHistoryContent data={data} /> : null;
}

function ArtistHistoryContent({ data }: { data: MusicArtistHistoryDataset }) {
  const [active, setActive] = useState<Inspection | null>(null);
  const touch = useRef<{ id: number; x: number; y: number } | null>(null), pointerType = useRef("");
  const dismissed = useRef<HTMLElement | null>(null);
  const dismissArtist = useDismissMusicHover(), tooltipId = useId(), headingId = useId();
  const dismiss = useCallback(() => setActive(null), []);
  const inspect = (artist: MusicHistoryArtist, index: number, anchor: HTMLElement) => {
    if (dismissed.current === anchor) return;
    dismissArtist?.();
    setActive(old => old?.artist === artist && old.index === index ? old : { artist, index, anchor });
  };
  useEffect(() => { dismiss(); }, [data, dismiss]);
  useEffect(() => {
    if (!active) return;
    const outside = (event: globalThis.PointerEvent) => { if (!active.anchor.contains(event.target as Node)) dismiss(); };
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); dismissed.current = active.anchor; dismiss(); } };
    document.addEventListener("pointerdown", outside, true); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside, true); document.removeEventListener("keydown", escape); };
  }, [active, dismiss]);
  const keyboard = (event: KeyboardEvent<HTMLDivElement>, artist: MusicHistoryArtist) => {
    const previous = active?.artist.key === artist.key ? active.index : -1;
    const next = event.key === "Home" ? 0 : event.key === "End" ? data.buckets.length - 1 : event.key === "ArrowRight" ? Math.min(data.buckets.length - 1, previous + 1) : event.key === "ArrowLeft" ? previous < 0 ? data.buckets.length - 1 : Math.max(0, previous - 1) : event.key === "Enter" || event.key === " " ? Math.max(0, previous) : null;
    if (next === null) return;
    event.preventDefault(); dismissed.current = null;
    const anchor = event.currentTarget.querySelector<HTMLElement>(`[data-season-index="${next}"]`);
    if (anchor) { anchor.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" }); inspect(artist, next, anchor); }
  };
  const touchDown = (event: PointerEvent<HTMLDivElement>) => {
    pointerType.current = event.pointerType;
    if (event.pointerType === "touch") { touch.current = event.isPrimary ? { id: event.pointerId, x: event.clientX, y: event.clientY } : null; dismiss(); }
  };
  const touchUp = (event: PointerEvent<HTMLDivElement>, artist: MusicHistoryArtist) => {
    const start = touch.current; touch.current = null;
    if (event.pointerType !== "touch" || start?.id !== event.pointerId || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) return;
    const anchor = (event.target as Element).closest<HTMLElement>("[data-season-index]");
    if (anchor) { dismissed.current = null; event.currentTarget.focus({ preventScroll: true }); inspect(artist, Number(anchor.dataset.seasonIndex), anchor); }
  };

  return <section id="music-artist-history" className="music-artist-history panel min-w-0 overflow-hidden rounded-[26px] p-5 sm:p-7" aria-labelledby={headingId}>
    <div className="mb-6"><p className="music-label">Some favorites last a season. Others last years.</p><h2 id={headingId} className="mt-3 font-display text-[clamp(38px,4vw,46px)] leading-none tracking-[-.025em]">The long <em className="text-accent">haul.</em></h2><p className="mt-3 max-w-[74ch] text-[14px] leading-relaxed text-muted">Seasonal favorites across the whole listening history. Brighter cells mean a bigger share of that season.</p></div>
    <div className="music-artist-scroll" role="region" aria-label="All-time seasonal artist heatmap" tabIndex={0} onScroll={event => event.currentTarget.style.setProperty("--artist-scroll-left", `${event.currentTarget.scrollLeft}px`)}>
      <div className="music-artist-grid" style={{ "--artist-season-count": data.buckets.length } as CSSProperties}>
        <div className="music-artist-grid-row music-artist-axis"><span>Artist</span><ArtistHistoryYears buckets={data.buckets} /></div>
        {data.groups.filter(group => group.artists.length).map(group => <div key={group.key}>
          <h3 className="music-artist-group"><span>{groupLabels[group.key]}</span><span aria-hidden="true" /></h3>
          {group.artists.map(artist => {
            const colors = artist.seasonPlays.map((plays, index) => artistSeasonColor(plays, data.buckets[index].plays));
            return <div key={artist.key} className="music-artist-grid-row">
              <span className="music-artist-name" onPointerEnter={dismiss} onFocus={dismiss}><MusicLink entity={{ kind: "artist", name: artist.name, url: artist.url }} className="block w-fit max-w-full truncate text-[14px] leading-[1.3]">{artist.name}</MusicLink></span>
              <div className="music-artist-cells" role="group" aria-label={`Explore ${artist.name} by season`} aria-describedby={active?.artist.key === artist.key ? tooltipId : undefined} tabIndex={0} onKeyDown={event => keyboard(event, artist)} onBlur={dismiss} onPointerDown={touchDown} onPointerMove={event => { const start = touch.current; if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) touch.current = null; }} onPointerUp={event => touchUp(event, artist)} onPointerCancel={() => { touch.current = null; dismiss(); }}>
                <div className="music-artist-cells-track">{data.buckets.map((bucket, index) => <span key={bucket.key} data-season-index={index} data-inspected={active?.artist.key === artist.key && active.index === index || undefined} className="music-artist-cell" style={{ "--heat-before": colors[index - 1] || "transparent", "--heat-current": colors[index], "--heat-after": colors[index + 1] || "transparent" } as CSSProperties} onPointerEnter={event => { if (event.pointerType !== "touch") { if (dismissed.current !== event.currentTarget) dismissed.current = null; inspect(artist, index, event.currentTarget); } }} onPointerLeave={event => { if (dismissed.current === event.currentTarget) dismissed.current = null; if (event.pointerType !== "touch") dismiss(); }} onClick={event => { if (pointerType.current !== "touch") { dismissed.current = null; event.currentTarget.closest<HTMLElement>(".music-artist-cells")?.focus({ preventScroll: true }); inspect(artist, index, event.currentTarget); } }} />)}</div>
              </div>
            </div>;
          })}
        </div>)}
      </div>
    </div>
    <div className="music-artist-legend mt-5"><span><i className="music-artist-scale" aria-hidden="true" />Less to more of the season</span><span><i className="music-artist-empty" aria-hidden="true" />No recorded history</span></div>
    <p className="mt-3 text-[12px] leading-relaxed text-muted">Four cells per year: winter, spring, summer, autumn. Recent interests reached the top five in the last eight seasons.</p>
    <span className="sr-only">Focus an artist’s seasons and use Left or Right to inspect, Home or End to jump, and Escape to close details. Winter includes December of the previous year. Gaps reflect available recorded history.</span>
    {active && <ArtistHistoryTooltip active={active} data={data} id={tooltipId} />}
  </section>;
}
