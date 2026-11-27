"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { type MusicArtistHistoryDataset, type MusicDataset, type MusicEntityKind, type MusicManifest, type MusicRecentTrack, type MusicRecommendationsDataset, type MusicSoundtrackDataset, type RankedMusic, type SpotifySnapshot } from "@/lib/music/types";
import { MusicSwap } from "./music-swap";
import { MusicSoundtrackChart } from "./music-soundtrack-chart";
import { ListeningChart, WeekdayChart } from "./music-history-charts";
import { MusicNumber, useMusicListMotion } from "./music-motion";
import { MusicArtists, MusicHoverProvider, MusicLink } from "./music-entity-link";
import { MusicNowPlaying } from "./music-now-playing";
import { findMusicArtistPhoto, MusicArtistBackground } from "./music-artist-background";
import { MusicPeriodFilter } from "./music-period-filter";
import { useMusicCollection } from "./use-music-collection";
import { useMusicPlayback } from "./use-music-playback";
import { spotifyEntityUrl } from "@/lib/music/entity-links";
import { musicPlaceholderStyle } from "@/lib/music/placeholder";
import { MusicArtistHistory } from "./music-artist-history";
import { MusicLastTracks } from "./music-last-tracks";
import { MusicRecommendations } from "./music-recommendations";
import { trackEvent } from "@/lib/analytics";
import { MusicIntro } from "./music-info";

const periodLabels: Record<string, string> = { all: "All time", "30d": "Last 30 days", "365d": "Last year" };
const safeImage = (value: string | null) => value && /^https:\/\/(i\.scdn\.co|image-cdn[^/]*\.spotifycdn\.com)\//.test(value) ? value : undefined;

function Cover({ item, className = "" }: { item: RankedMusic; className?: string }) {
  const image = safeImage(item.image);
  return <span className={`music-cover ${className}`} style={image ? undefined : musicPlaceholderStyle(item.name)}>{image ? <img src={image} alt="" loading="lazy" width="160" height="160" /> : <span aria-hidden="true">{item.name.slice(0, 1)}</span>}</span>;
}

function Ranking({ items, empty, kind, resetKey }: { items: RankedMusic[]; empty: string; kind: MusicEntityKind; resetKey: string }) {
  const scroll = useRef<HTMLDivElement>(null);
  const motion = useMusicListMotion(items.slice(0, 100).map((item, i, list) => ({ ...item, kind, rank: i + 1, last: i === list.length - 1 })), 0);
  useLayoutEffect(() => { scroll.current?.scrollTo({ top: 0, behavior: "instant" }); }, [kind, resetKey]);
  return <div ref={scroll} className="music-ranking-scroll" role="region" aria-label={`Favorite ${kind === "artist" ? "artists" : kind === "album" ? "albums" : "tracks"}`} tabIndex={0}><div className="music-collection" style={motion.containerStyle}><ol ref={motion.setRoot} className="music-ranking">{motion.rows.map(({ item, phase }) => <li ref={motion.bind(item.key)} key={item.key} data-analytics-item-rank={item.rank} data-phase={phase} data-last={item.last || undefined} inert={phase === "exit" ? true : undefined} aria-hidden={phase === "exit" || undefined} style={phase === "exit" ? motion.exitStyle(item.key) : undefined}>
    <span className="w-7 shrink-0 text-[14px] text-muted tabular-nums">{String(item.rank).padStart(2, "0")}</span>
    <Cover item={item} className="h-12 w-12 shrink-0 rounded-lg" />
    <div className="min-w-0 flex-1"><MusicLink entity={{ kind: item.kind, name: item.name, artists: item.artists, url: item.url, image: item.kind !== "artist" ? item.image : null }} className="block w-fit max-w-full truncate font-medium">{item.name}</MusicLink>{item.kind !== "artist" && <p className="truncate text-[14px] text-muted"><MusicArtists names={item.artists} /></p>}</div>
    <span className="shrink-0 text-[14px] text-muted tabular-nums"><MusicNumber value={item.plays} /><span className="sr-only"> recorded plays</span></span>
  </li>)}{!items.length && <li className="music-ranking-empty text-muted">{empty}</li>}</ol></div></div>;
}

function Rotation({ items }: { items: RankedMusic[] }) {
  const motion = useMusicListMotion(items.slice(1, 7).map((item, i) => ({ ...item, rank: i + 2 })));
  return <div className="music-collection" style={motion.containerStyle}><div ref={motion.setRoot} className="music-album-grid">{motion.rows.map(({ item, phase }) => <article ref={motion.bind(item.key)} key={item.key} data-analytics-item-rank={item.rank} className="music-album group" data-phase={phase} inert={phase === "exit" ? true : undefined} aria-hidden={phase === "exit" || undefined} style={phase === "exit" ? motion.exitStyle(item.key) : undefined}>
    <MusicLink entity={{ kind: "track", name: item.name, artists: item.artists, url: item.url, image: item.image }} analyticsSlot="cover" className="relative block"><Cover item={item} className="aspect-square w-full rounded-[14px]" /><span className="music-album-rank">{String(item.rank).padStart(2, "0")}</span></MusicLink>
    <h3 className="mt-3 truncate font-medium"><MusicLink entity={{ kind: "track", name: item.name, artists: item.artists, url: item.url, image: item.image }}>{item.name}</MusicLink></h3><p className="mt-1 truncate text-[14px] text-muted"><MusicArtists names={item.artists} /></p>
  </article>)}</div></div>;
}

interface Props { initialManifest: MusicManifest | null; initialData: MusicDataset | null; initialSpotify: SpotifySnapshot | null; initialSoundtrack: MusicSoundtrackDataset | null; initialArtistHistory: MusicArtistHistoryDataset | null; initialRecommendations: MusicRecommendationsDataset | null; initialRecentTracks: MusicRecentTrack[] }
export function MusicExplorer({ initialManifest, initialData, initialSpotify, initialSoundtrack, initialArtistHistory, initialRecommendations, initialRecentTracks }: Props) {
  const [period, setPeriod] = useState("30d");
  const [pendingChart, setPendingChart] = useState<"favorites" | null>(null);
  const [tab, setTab] = useState<"tracks" | "artists" | "albums">("tracks");
  const { manifest, data, spotify, soundtrack, artistHistory, recommendations, error, loading, api, ready } = useMusicCollection({ manifest: initialManifest, data: initialData, spotify: initialSpotify, soundtrack: initialSoundtrack, artistHistory: initialArtistHistory, recommendations: initialRecommendations }, period);
  const playback = useMusicPlayback();
  const [headerHeight, setHeaderHeight] = useState<number | null>(null);
  const historyHeading = useRef<HTMLDivElement>(null);
  const historyFilters = useRef<HTMLDivElement>(null);
  const favorites = useRef<HTMLElement>(null);
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
    const filters = historyFilters.current;
    if (!heading || !filters || headerHeight === null) return;
    let observer: IntersectionObserver;
    const observeSticky = () => {
      observer?.disconnect();
      const stickyTop = parseFloat(getComputedStyle(filters).top);
      // The bar follows the heading with a 24px gap. Watch that fixed origin, not the moving sticky box.
      observer = new IntersectionObserver(([entry]) => setFiltersStuck(entry.boundingClientRect.bottom + 24 <= stickyTop), { rootMargin: `${24 - stickyTop}px 0px 0px 0px`, threshold: 0 });
      observer.observe(heading);
    };
    observeSticky();
    addEventListener("resize", observeSticky);
    return () => { observer.disconnect(); removeEventListener("resize", observeSticky); };
  }, [headerHeight]);
  useEffect(() => {
    const applyLocation = () => {
      const query = new URLSearchParams(location.search); setPeriod(query.get("period") || "30d");
      setPendingChart(query.get("chart") === "favorites" ? "favorites" : null);
      if (query.has("platform")) { query.delete("platform"); history.replaceState(history.state, "", `${location.pathname}${query.size ? `?${query}` : ""}${location.hash}`); }
    };
    applyLocation(); addEventListener("popstate", applyLocation);
    return () => removeEventListener("popstate", applyLocation);
  }, []);
  // A static build can have a placeholder manifest without historical years. Validate against the live collection.
  useEffect(() => { if (ready && manifest && !manifest.periods.includes(period)) setPeriod("30d"); }, [manifest, period, ready]);
  useEffect(() => {
    if (pendingChart !== "favorites" || !ready || data?.period !== period || headerHeight === null) return;
    let cancelled = false, frame = 0;
    // The collection commits all datasets together. Wait for font layout before measuring the destination.
    void document.fonts.ready.then(() => {
      if (cancelled) return;
      frame = requestAnimationFrame(() => {
        const target = favorites.current, filters = historyFilters.current;
        if (!target || !filters) return;
        const offset = parseFloat(getComputedStyle(filters).top) + filters.getBoundingClientRect().height + 24;
        window.scrollTo({ top: Math.max(0, window.scrollY + target.getBoundingClientRect().top - offset), behavior: "instant" });
        setPendingChart(null);
      });
    });
    return () => { cancelled = true; cancelAnimationFrame(frame); };
  }, [pendingChart, ready, data?.period, period, headerHeight]);
  function filter(nextPeriod: string, replace = false) {
    if (nextPeriod === period) return;
    trackEvent("music_period_change", { period: nextPeriod, method: replace ? "scrub" : "select" });
    setPeriod(nextPeriod);
    setPendingChart(null);
    const query = new URLSearchParams(location.search); query.delete("platform"); query.set("period", nextPeriod);
    history[replace ? "replaceState" : "pushState"](history.state, "", `${location.pathname}?${query}${location.hash}`);
  }
  // Keep the saved view while fetching instead of flashing zero counts between periods.
  const current = data;
  const stats = current?.stats;
  const provider = spotify?.ranges.short_term;
  const featured = provider?.tracks[0] || stats?.topTracks[0];
  const [fallbackReady, setFallbackReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setFallbackReady(true), 500);
    return () => clearTimeout(timer);
  }, []);
  const featureReady = Boolean(featured) || fallbackReady;
  const artistImages = [
    ...Object.values(spotify?.ranges || {}).flatMap(range => range.artists),
    ...(stats?.topArtists || []),
  ];
  const artistPhoto = findMusicArtistPhoto(featured?.artists[0], artistImages);
  const rankings = stats ? tab === "artists" ? stats.topArtists : tab === "albums" ? stats.topAlbums : stats.topTracks : [];
  return <MusicHoverProvider file={manifest?.files.entities} api={api} resetKey={`${period}:${tab}`}>
    <div className="flex flex-col justify-between gap-7 sm:flex-row sm:items-end"><div className="min-w-0"><h1 className="page-title">For the <em className="text-accent">record</em></h1><MusicIntro /></div><a className="pill w-fit" data-analytics-social="spotify" href="https://open.spotify.com/user/1271912429" target="_blank" rel="noopener noreferrer">Find me on Spotify<span className="sr-only"> (opens in a new tab)</span></a></div>

    {/* Mount fresh swap content when data beats the grace period, without animating an unseen fallback. */}
    <section key={featureReady ? "ready" : "pending"} data-pending={!featureReady || undefined} data-analytics-view="featured_music" data-analytics-period={provider ? "spotify_short_term" : current?.period || period} data-analytics-item-rank={1} className="music-feature panel relative grid min-h-[340px] overflow-hidden rounded-[28px] md:grid-cols-[1.05fr_1fr]" aria-label="Featured music">
      <MusicArtistBackground image={artistPhoto} />
      <div className="relative z-10 flex flex-col items-start justify-center p-7 sm:p-10 lg:p-12"><MusicSwap identity={featured?.key || "empty"} className="w-full"><p className="music-label">{provider ? "Lately, on repeat" : featured ? "A familiar favorite" : "Every era has a soundtrack"}</p><h2 className="mt-5 max-w-[13ch] font-display text-[clamp(42px,5vw,70px)] leading-[.95] tracking-[-.025em]">{featured ? <MusicLink entity={{ kind: "track", name: featured.name, artists: featured.artists, url: featured.url, image: featured.image }}>{featured.name}</MusicLink> : <>Good music.<br /><em className="text-accent">Long memory.</em></>}</h2><p className="mt-4 text-[18px] text-muted">{featured ? <MusicArtists names={featured.artists} /> : "Bringing the listening history together."}</p>{featured && <a className="mt-7 border-b border-ink pb-1 text-[14px] hover:text-accent" href={spotifyEntityUrl({ kind: "track", name: featured.name, artists: featured.artists, url: featured.url })} target="_blank" rel="noopener noreferrer">Listen on Spotify<span className="sr-only"> (opens in a new tab)</span></a>}<p className="mt-6 text-[13px] text-muted">{provider ? "From Spotify’s top tracks in the last four weeks." : "A collection across Spotify, Google Play Music, and YouTube Music."}</p></MusicSwap></div>
      <div className="music-record-scene" aria-hidden="true"><div className="music-record"><div className="music-record-label"><MusicSwap identity={featured?.key || "empty"} className="h-full w-full">{featured && safeImage(featured.image) ? <img src={safeImage(featured.image)} alt="" width="220" height="220" /> : null}</MusicSwap></div></div></div>
    </section>

    <MusicRecommendations data={recommendations} />

    {provider && <section data-analytics-view="heavy_rotation" data-analytics-period="spotify_short_term" aria-labelledby="music-lately-title"><div className="mb-5"><p className="music-label">The current mix</p><h2 id="music-lately-title" className="mt-2 font-display text-[42px] leading-none">Heavy <em className="text-accent">rotation.</em></h2></div><Rotation items={provider.tracks} /><p className="mt-4 text-[13px] text-muted">Spotify’s affinity rankings.</p></section>}

    <MusicLastTracks tracks={playback?.recentTracks ?? initialRecentTracks} />
    <MusicArtistHistory data={artistHistory} />
    <section aria-labelledby="music-history-title" className="music-history flex min-w-0 flex-col gap-6"><div ref={historyHeading}><p className="music-label">The bigger picture</p><h2 id="music-history-title" className="mt-2 font-display text-[42px] leading-none">Listening <em className="text-accent">history.</em></h2></div><div ref={historyFilters} className="music-history-filters" data-stuck={filtersStuck || undefined} role="group" aria-label="Filter listening history" style={headerHeight === null ? undefined : { "--music-header-offset": `${headerHeight}px` } as CSSProperties}><MusicPeriodFilter period={period} periods={manifest?.periods || ["all", "30d", "365d"]} onChange={filter} /></div>
      <div className="flex w-full min-w-0 flex-col gap-6"><div aria-live="polite" className={error || !loading && !stats?.plays ? "text-[13px] text-muted" : "sr-only"}>{loading ? "Loading listening history…" : error ? "The latest update is unavailable. Showing the saved collection." : stats?.plays ? `Showing listening history for ${periodLabels[current?.period || period] || period}.` : "Historical imports are being collected. The archive will grow as new plays arrive."}</div>
      <div aria-busy={loading} className="flex flex-col gap-5">
        <div className="music-stat-grid">{[["Recorded plays", stats?.plays || 0], ["Different artists", stats?.artists || 0], ["Different tracks", stats?.tracks || 0], ["Measured hours", Math.round((stats?.msPlayed || 0) / 3600000)]].map(([label, value]) => <div key={label} className="panel rounded-[20px] p-5 sm:p-6"><p className="music-label">{label}</p><p className="mt-3 font-display text-[clamp(44px,5vw,64px)] leading-none tabular-nums">{label === "Measured hours" && !stats?.durationKnown ? <span className="text-muted">Pending</span> : <MusicNumber value={Number(value)} />}</p></div>)}</div>
        {current && <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]"><ListeningChart data={current} /><WeekdayChart data={current} /></div>}
        <section ref={favorites} className="panel rounded-[24px] p-5 sm:p-7" data-analytics-view="favorites" data-analytics-period={current?.period || period} data-analytics-metric={tab} aria-labelledby="music-ranking-title"><div className="mb-5 flex flex-wrap items-center justify-between gap-4"><h2 id="music-ranking-title" className="font-display text-[36px] leading-none">The <em className="text-accent">favorites.</em></h2><div role="group" aria-label="Rank music by" className="music-tabs">{(["tracks", "albums", "artists"] as const).map(t => <button key={t} aria-pressed={tab === t} onClick={() => { if (t !== tab) trackEvent("music_ranking_change", { metric: t, period }); setTab(t); }} className="capitalize">{t}</button>)}</div></div><Ranking kind={tab === "tracks" ? "track" : tab === "albums" ? "album" : "artist"} resetKey={`${period}:${current?.period}`} items={rankings.map(item => ({ ...item, key: `${tab}:${item.key}` }))} empty={stats?.plays ? "More metadata is needed for this view." : "The first chapters of this collection are still coming in."} /></section>
      </div>
      <MusicSoundtrackChart data={soundtrack} period={period} api={api} loading={loading} error={error} />
      </div>
    </section>
    {spotify?.playlists.length ? <section data-analytics-view="playlists" aria-labelledby="music-playlists-title"><p className="music-label">Mixtapes, more or less</p><h2 id="music-playlists-title" className="mt-2 font-display text-[42px]">In the <em className="text-accent">collection.</em></h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{spotify.playlists.slice(0, 9).map((p, index) => <a data-analytics-hover="music" data-analytics-item-type="playlist" data-analytics-item-name={p.name} data-analytics-item-rank={index + 1} data-analytics-item-slot="playlist" key={p.id} className="panel flex items-center gap-4 rounded-[18px] p-4 hover:border-accent" href={p.url} target="_blank" rel="noopener noreferrer"><span className="music-playlist-icon" aria-hidden="true">♫</span><span className="min-w-0"><span className="block truncate font-medium">{p.name}</span><span className="mt-1 block text-[13px] text-muted"><MusicNumber value={p.tracks} /> tracks · Spotify</span></span><span className="sr-only"> (opens in a new tab)</span></a>)}</div></section> : null}
    <noscript><p className="panel rounded-[20px] p-5">This is the saved music collection. Enable JavaScript to explore other periods.</p></noscript>
    <MusicNowPlaying snapshot={playback} artistImages={[...artistImages, ...(playback?.artistImages || [])]} />
  </MusicHoverProvider>;
}
