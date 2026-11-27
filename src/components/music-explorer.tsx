"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { type MusicDataset, type MusicEntityKind, type MusicManifest, type MusicSoundtrackDataset, type RankedMusic, type SpotifySnapshot } from "@/lib/music/types";
import { MusicSwap } from "./music-swap";
import { MusicSoundtrackChart } from "./music-soundtrack-chart";
import { ListeningChart, WeekdayChart } from "./music-history-charts";
import { MusicNumber, useMusicListMotion } from "./music-motion";
import { MusicArtists, MusicHoverProvider, MusicLink } from "./music-entity-link";
import { MusicNowPlaying } from "./music-now-playing";
import { MusicPeriodFilter } from "./music-period-filter";
import { useMusicCollection } from "./use-music-collection";
import { spotifyEntityUrl } from "@/lib/music/entity-links";

const periodLabels: Record<string, string> = { all: "All time", "30d": "Last 30 days", "365d": "Last year" };
const safeImage = (value: string | null) => value && /^https:\/\/(i\.scdn\.co|image-cdn[^/]*\.spotifycdn\.com)\//.test(value) ? value : undefined;

function Cover({ item, className = "" }: { item: RankedMusic; className?: string }) {
  const image = safeImage(item.image);
  return <span className={`music-cover ${className}`}>{image ? <img src={image} alt="" loading="lazy" width="160" height="160" /> : <span aria-hidden="true">{item.name.slice(0, 1)}</span>}</span>;
}

function Ranking({ items, empty, kind, resetKey }: { items: RankedMusic[]; empty: string; kind: MusicEntityKind; resetKey: string }) {
  const scroll = useRef<HTMLDivElement>(null);
  const motion = useMusicListMotion(items.slice(0, 100).map((item, i, list) => ({ ...item, kind, rank: i + 1, last: i === list.length - 1 })), 0);
  useLayoutEffect(() => { scroll.current?.scrollTo({ top: 0, behavior: "instant" }); }, [kind, resetKey]);
  return <div ref={scroll} className="music-ranking-scroll" role="region" aria-label={`Favorite ${kind === "artist" ? "artists" : kind === "album" ? "albums" : "tracks"}`} tabIndex={0}><div className="music-collection" style={motion.containerStyle}><ol ref={motion.setRoot} className="music-ranking">{motion.rows.map(({ item, phase }) => <li ref={motion.bind(item.key)} key={item.key} data-phase={phase} data-last={item.last || undefined} inert={phase === "exit" ? true : undefined} aria-hidden={phase === "exit" || undefined} style={phase === "exit" ? motion.exitStyle(item.key) : undefined}>
    <span className="w-7 shrink-0 text-[14px] text-muted tabular-nums">{String(item.rank).padStart(2, "0")}</span>
    <Cover item={item} className="h-12 w-12 shrink-0 rounded-lg" />
    <div className="min-w-0 flex-1"><MusicLink entity={{ kind: item.kind, name: item.name, artists: item.artists, url: item.url, image: item.kind !== "artist" ? item.image : null }} className="block w-fit max-w-full truncate font-medium">{item.name}</MusicLink>{item.kind !== "artist" && <p className="truncate text-[14px] text-muted"><MusicArtists names={item.artists} /></p>}</div>
    <span className="shrink-0 text-[14px] text-muted tabular-nums"><MusicNumber value={item.plays} /><span className="sr-only"> recorded plays</span></span>
  </li>)}{!items.length && <li className="music-ranking-empty text-muted">{empty}</li>}</ol></div></div>;
}

function Rotation({ items }: { items: RankedMusic[] }) {
  const motion = useMusicListMotion(items.slice(1, 7).map((item, i) => ({ ...item, rank: i + 2 })));
  return <div className="music-collection" style={motion.containerStyle}><div ref={motion.setRoot} className="music-album-grid">{motion.rows.map(({ item, phase }) => <article ref={motion.bind(item.key)} key={item.key} className="music-album group" data-phase={phase} inert={phase === "exit" ? true : undefined} aria-hidden={phase === "exit" || undefined} style={phase === "exit" ? motion.exitStyle(item.key) : undefined}>
    <MusicLink entity={{ kind: "track", name: item.name, artists: item.artists, url: item.url, image: item.image }} className="relative block"><Cover item={item} className="aspect-square w-full rounded-[14px]" /><span className="music-album-rank">{String(item.rank).padStart(2, "0")}</span></MusicLink>
    <h3 className="mt-3 truncate font-medium"><MusicLink entity={{ kind: "track", name: item.name, artists: item.artists, url: item.url, image: item.image }}>{item.name}</MusicLink></h3><p className="mt-1 truncate text-[14px] text-muted"><MusicArtists names={item.artists} /></p>
  </article>)}</div></div>;
}

interface Props { initialManifest: MusicManifest | null; initialData: MusicDataset | null; initialSpotify: SpotifySnapshot | null; initialSoundtrack: MusicSoundtrackDataset | null }
export function MusicExplorer({ initialManifest, initialData, initialSpotify, initialSoundtrack }: Props) {
  const [period, setPeriod] = useState("30d");
  const [tab, setTab] = useState<"tracks" | "artists" | "albums">("tracks");
  const { manifest, data, spotify, soundtrack, playback, error, loading, api } = useMusicCollection({ manifest: initialManifest, data: initialData, spotify: initialSpotify, soundtrack: initialSoundtrack, playback: null }, period);
  const [headerHeight, setHeaderHeight] = useState<number | null>(null);
  const historyHeading = useRef<HTMLDivElement>(null);
  const [filtersStuck, setFiltersStuck] = useState(false);
  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".site-header");
    if (!header) return;
    const measure = () => setHeaderHeight(header.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure); observer.observe(header);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const heading = historyHeading.current;
    if (!heading || headerHeight === null) return;
    const stickyTop = headerHeight + 12;
    // The bar follows the heading with a 24px gap. Watch that fixed origin, not the moving sticky box.
    const observer = new IntersectionObserver(([entry]) => setFiltersStuck(entry.boundingClientRect.bottom + 24 <= stickyTop), { rootMargin: `${24 - stickyTop}px 0px 0px 0px`, threshold: 0 });
    observer.observe(heading);
    return () => observer.disconnect();
  }, [headerHeight]);
  useEffect(() => {
    const applyLocation = () => {
      const query = new URLSearchParams(location.search); setPeriod(query.get("period") || "30d");
      if (query.has("platform")) { query.delete("platform"); history.replaceState(history.state, "", `${location.pathname}${query.size ? `?${query}` : ""}${location.hash}`); }
    };
    applyLocation(); addEventListener("popstate", applyLocation);
    return () => removeEventListener("popstate", applyLocation);
  }, []);
  useEffect(() => { if (manifest && !manifest.periods.includes(period)) setPeriod("30d"); }, [manifest, period]);
  function filter(nextPeriod: string, replace = false) {
    if (nextPeriod === period) return;
    setPeriod(nextPeriod);
    const query = new URLSearchParams(location.search); query.delete("platform"); query.set("period", nextPeriod);
    history[replace ? "replaceState" : "pushState"](history.state, "", `${location.pathname}?${query}${location.hash}`);
  }
  // Keep the saved view while fetching instead of flashing zero counts between periods.
  const current = data;
  const stats = current?.stats;
  const provider = spotify?.ranges.short_term;
  const featured = provider?.tracks[0] || stats?.topTracks[0];
  const featuredArtist = featured?.artists[0]?.trim().toLowerCase();
  const artistPhoto = safeImage([
    ...Object.values(spotify?.ranges || {}).flatMap(range => range.artists),
    ...(stats?.topArtists || []),
  ].find(artist => artist.name.trim().toLowerCase() === featuredArtist && safeImage(artist.image))?.image || null);
  const rankings = stats ? tab === "artists" ? stats.topArtists : tab === "albums" ? stats.topAlbums : stats.topTracks : [];
  return <MusicHoverProvider file={manifest?.files.entities} api={api} resetKey={`${period}:${tab}`}>
    <div className="flex flex-col justify-between gap-7 sm:flex-row sm:items-end"><div><p className="music-label mb-5">My music, through time</p><h1 className="page-title">On <em>repeat.</em></h1><p className="mt-6 max-w-[42ch] text-[18px] leading-relaxed text-muted">The songs that stick around. A listening history, one obsession at a time.</p></div><a className="pill w-fit" href="https://open.spotify.com/user/1271912429" target="_blank" rel="noopener noreferrer">Find me on Spotify<span className="sr-only"> (opens in a new tab)</span></a></div>

    <section className="music-feature panel relative grid min-h-[340px] overflow-hidden rounded-[28px] md:grid-cols-[1.05fr_1fr]" aria-label="Featured music">
      <div className="music-feature-backdrop" aria-hidden="true">
        {/* Derive alpha from the blurred, tinted image while preserving its color and existing transparency. */}
        <svg className="absolute" width="0" height="0" focusable="false">
          <defs>
            <filter id="music-photo-luminance" colorInterpolationFilters="sRGB">
              <feColorMatrix in="SourceGraphic" type="luminanceToAlpha" result="luminance" />
              <feComposite in="SourceGraphic" in2="luminance" operator="in" />
            </filter>
          </defs>
        </svg>
        <MusicSwap identity={artistPhoto || "empty"} className="h-full w-full">
          {artistPhoto && <img src={artistPhoto} alt="" width="640" height="640" onError={event => { event.currentTarget.style.visibility = "hidden"; }} />}
        </MusicSwap>
      </div>
      <div className="relative z-10 flex flex-col items-start justify-center p-7 sm:p-10 lg:p-12"><MusicSwap identity={featured?.key || "empty"} className="w-full"><p className="music-label">{provider ? "Lately, on repeat" : featured ? "A familiar favorite" : "Every era has a soundtrack"}</p><h2 className="mt-5 max-w-[13ch] font-display text-[clamp(42px,5vw,70px)] leading-[.95] tracking-[-.025em]">{featured ? <MusicLink entity={{ kind: "track", name: featured.name, artists: featured.artists, url: featured.url, image: featured.image }}>{featured.name}</MusicLink> : <>Good music.<br /><em className="text-accent">Long memory.</em></>}</h2><p className="mt-4 text-[18px] text-muted">{featured ? <MusicArtists names={featured.artists} /> : "Bringing the listening history together."}</p>{featured && <a className="mt-7 border-b border-ink pb-1 text-[14px] hover:text-accent" href={spotifyEntityUrl({ kind: "track", name: featured.name, artists: featured.artists, url: featured.url })} target="_blank" rel="noopener noreferrer">Listen on Spotify<span className="sr-only"> (opens in a new tab)</span></a>}<p className="mt-6 text-[13px] text-muted">{provider ? "From Spotify’s top tracks in the last four weeks." : "A collection across Spotify, Google Play Music, and YouTube Music."}</p></MusicSwap></div>
      <div className="music-record-scene" aria-hidden="true"><div className="music-record"><div className="music-record-label"><MusicSwap identity={featured?.key || "empty"} className="h-full w-full">{featured && safeImage(featured.image) ? <img src={safeImage(featured.image)} alt="" width="220" height="220" /> : <span>j<span className="italic">j.</span></span>}</MusicSwap></div></div></div>
    </section>

    {provider && <section aria-labelledby="music-lately-title"><div className="mb-5"><p className="music-label">The current rotation</p><h2 id="music-lately-title" className="mt-2 font-display text-[42px] leading-none">Heavy <em className="text-accent">rotation.</em></h2></div><Rotation items={provider.tracks} /><p className="mt-4 text-[13px] text-muted">Spotify’s affinity rankings.</p></section>}

    <section aria-labelledby="music-history-title" className="music-history flex min-w-0 flex-col gap-6"><div ref={historyHeading}><p className="music-label">The bigger picture</p><h2 id="music-history-title" className="mt-2 font-display text-[42px] leading-none">Listening <em className="text-accent">history.</em></h2></div><div className="music-history-filters" data-stuck={filtersStuck || undefined} role="group" aria-label="Filter listening history" style={headerHeight === null ? undefined : { "--music-header-offset": `${headerHeight}px` } as CSSProperties}><MusicPeriodFilter period={period} periods={manifest?.periods || ["all", "30d", "365d"]} onChange={filter} /></div>
      <div className="flex w-full min-w-0 flex-col gap-6"><div aria-live="polite" className={error || !loading && !stats?.plays ? "text-[13px] text-muted" : "sr-only"}>{loading ? "Loading listening history…" : error ? "The latest update is unavailable. Showing the saved collection." : stats?.plays ? `Showing listening history for ${periodLabels[current?.period || period] || period}.` : "Historical imports are being collected. The archive will grow as new plays arrive."}</div>
      <div aria-busy={loading} className="flex flex-col gap-5">
        <div className="music-stat-grid">{[["Recorded plays", stats?.plays || 0], ["Different artists", stats?.artists || 0], ["Different tracks", stats?.tracks || 0], ["Measured hours", Math.round((stats?.msPlayed || 0) / 3600000)]].map(([label, value]) => <div key={label} className="panel rounded-[20px] p-5 sm:p-6"><p className="music-label">{label}</p><p className="mt-3 font-display text-[clamp(44px,5vw,64px)] leading-none tabular-nums">{label === "Measured hours" && !stats?.durationKnown ? <span className="text-muted">Pending</span> : <MusicNumber value={Number(value)} />}</p></div>)}</div>
        {current && <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]"><ListeningChart data={current} /><WeekdayChart data={current} /></div>}
        <section className="panel rounded-[24px] p-5 sm:p-7" aria-labelledby="music-ranking-title"><div className="mb-5 flex flex-wrap items-center justify-between gap-4"><h2 id="music-ranking-title" className="font-display text-[36px] leading-none">The <em className="text-accent">favorites.</em></h2><div role="group" aria-label="Rank music by" className="music-tabs">{(["tracks", "artists", "albums"] as const).map(t => <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)} className="capitalize">{t}</button>)}</div></div><Ranking kind={tab === "tracks" ? "track" : tab === "albums" ? "album" : "artist"} resetKey={`${period}:${current?.period}`} items={rankings.map(item => ({ ...item, key: `${tab}:${item.key}` }))} empty={stats?.plays ? "More metadata is needed for this view." : "The first chapters of this collection are still coming in."} /></section>
      </div>
      <MusicSoundtrackChart data={soundtrack} period={period} api={api} loading={loading} error={error} />
      </div>
    </section>
    {spotify?.playlists.length ? <section aria-labelledby="music-playlists-title"><p className="music-label">Mixtapes, more or less</p><h2 id="music-playlists-title" className="mt-2 font-display text-[42px]">In the <em className="text-accent">collection.</em></h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{spotify.playlists.slice(0, 9).map(p => <a key={p.id} className="panel flex items-center gap-4 rounded-[18px] p-4 hover:border-accent" href={p.url} target="_blank" rel="noopener noreferrer"><span className="music-playlist-icon" aria-hidden="true">♫</span><span className="min-w-0"><span className="block truncate font-medium">{p.name}</span><span className="mt-1 block text-[13px] text-muted"><MusicNumber value={p.tracks} /> tracks · Spotify</span></span><span className="sr-only"> (opens in a new tab)</span></a>)}</div></section> : null}
    <noscript><p className="panel rounded-[20px] p-5">This is the saved music collection. Enable JavaScript to explore other periods.</p></noscript>
    <MusicNowPlaying snapshot={playback} />
  </MusicHoverProvider>;
}
