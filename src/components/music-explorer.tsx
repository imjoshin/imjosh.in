"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { platformLabels, type MusicDataset, type MusicManifest, type MusicPlatform, type MusicSeasonalDataset, type RankedMusic, type SpotifySnapshot } from "@/lib/music/types";
import { MusicSwap } from "./music-swap";
import { MusicSeasonChart } from "./music-season-chart";
import { ListeningChart, WeekdayChart } from "./music-history-charts";

const number = (value: number) => new Intl.NumberFormat("en-US").format(value);
const periodLabels: Record<string, string> = { all: "All time", "30d": "Last 30 days", "365d": "Last year" };
const rangeLabels: Record<string, string> = { short_term: "Last 4 weeks", medium_term: "Last 6 months", long_term: "Last year" };
const dateLabel = (value: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
const safeLink = (value: string | null) => value && /^https:\/\/(open\.spotify\.com|music\.youtube\.com|www\.youtube\.com)\//.test(value) ? value : undefined;
const safeImage = (value: string | null) => value && /^https:\/\/(i\.scdn\.co|image-cdn[^/]*\.spotifycdn\.com)\//.test(value) ? value : undefined;

function Cover({ item, className = "" }: { item: RankedMusic; className?: string }) {
  const image = safeImage(item.image);
  return <span className={`music-cover ${className}`}>{image ? <img src={image} alt="" loading="lazy" width="160" height="160" /> : <span aria-hidden="true">{item.name.slice(0, 1)}</span>}</span>;
}

function Ranking({ items, count = true }: { items: RankedMusic[]; count?: boolean }) {
  return <ol className="music-ranking">{items.slice(0, 10).map((item, index) => <li key={item.key} style={{ "--music-order": index } as CSSProperties}>
    <span className="w-5 shrink-0 text-[14px] text-muted tabular-nums">{String(index + 1).padStart(2, "0")}</span>
    <Cover item={item} className="h-12 w-12 shrink-0 rounded-lg" />
    <div className="min-w-0 flex-1"><a href={safeLink(item.url)} target={safeLink(item.url) ? "_blank" : undefined} rel="noopener noreferrer" className="block truncate font-medium hover:text-accent">{item.name}</a><p className="truncate text-[14px] text-muted">{item.artists.join(", ") || "Artist"}</p></div>
    {count && <span className="shrink-0 text-[14px] text-muted tabular-nums">{number(item.plays)}<span className="sr-only"> recorded plays</span></span>}
  </li>)}</ol>;
}

interface Props { initialManifest: MusicManifest | null; initialData: MusicDataset | null; initialSpotify: SpotifySnapshot | null; initialSeasons: MusicSeasonalDataset | null }
export function MusicExplorer({ initialManifest, initialData, initialSpotify, initialSeasons }: Props) {
  const [manifest, setManifest] = useState(initialManifest), [data, setData] = useState(initialData), [spotify, setSpotify] = useState(initialSpotify);
  const [platform, setPlatform] = useState<MusicPlatform | "all">("all"), [period, setPeriod] = useState("30d"), [range, setRange] = useState("short_term");
  const [tab, setTab] = useState<"tracks" | "artists" | "albums">("tracks"), [error, setError] = useState(false), [loading, setLoading] = useState(false);
  const [api, setApi] = useState(false);
  const [headerHeight, setHeaderHeight] = useState<number | null>(null);
  const [seasons, setSeasons] = useState(initialSeasons), [seasonsLoading, setSeasonsLoading] = useState(false), [seasonsError, setSeasonsError] = useState(false);
  const read = async <T,>(file: string, useApi: boolean, signal?: AbortSignal): Promise<T> => {
    const response = await fetch(useApi ? `/api/music?file=${encodeURIComponent(file)}` : `/music/${file}`, { signal });
    if (!response.ok) throw new Error("Music data is unavailable");
    return response.json() as Promise<T>;
  };
  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".site-header");
    if (!header) return;
    const measure = () => setHeaderHeight(header.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure); observer.observe(header);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const useApi = location.hostname === "imjosh.in" || location.hostname.endsWith(".netlify.app"); setApi(useApi);
    read<MusicManifest>("manifest.json", useApi, controller.signal).then(setManifest).catch(() => { if (!controller.signal.aborted) setError(true); });
    const applyLocation = () => { const query = new URLSearchParams(location.search); setPeriod(query.get("period") || "30d"); setPlatform((query.get("platform") || "all") as MusicPlatform | "all"); };
    applyLocation(); addEventListener("popstate", applyLocation);
    return () => { controller.abort(); removeEventListener("popstate", applyLocation); };
  }, []);
  useEffect(() => {
    if (!manifest) return;
    const selectedPlatform = platform === "all" || manifest.platforms.includes(platform) ? platform : "all";
    const selectedPeriod = manifest.periods.includes(period) ? period : "30d";
    if (selectedPlatform !== platform) { setPlatform(selectedPlatform); return; }
    if (selectedPeriod !== period) { setPeriod(selectedPeriod); return; }
    const file = manifest.files[`${platform}/${period}`]; if (!file) { setData(null); return; }
    const controller = new AbortController(); setLoading(true);
    read<MusicDataset>(file, api, controller.signal).then(value => { setData(value); setError(false); }).catch(() => { if (!controller.signal.aborted) setError(true); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [manifest, platform, period, api]);
  useEffect(() => {
    if (!manifest?.files.spotify) return;
    const controller = new AbortController(); read<SpotifySnapshot>(manifest.files.spotify, api, controller.signal).then(setSpotify).catch(() => {});
    return () => controller.abort();
  }, [manifest, api]);
  useEffect(() => {
    if (!manifest) return;
    const file = manifest.files[`${platform}/seasons`];
    if (!file) { setSeasons(null); setSeasonsLoading(false); return; }
    const controller = new AbortController(); setSeasonsLoading(true); setSeasonsError(false);
    read<MusicSeasonalDataset>(file, api, controller.signal).then(setSeasons).catch(() => { if (!controller.signal.aborted) setSeasonsError(true); }).finally(() => { if (!controller.signal.aborted) setSeasonsLoading(false); });
    return () => controller.abort();
  }, [manifest, platform, api]);
  function filter(nextPlatform: MusicPlatform | "all", nextPeriod: string) {
    setPlatform(nextPlatform); setPeriod(nextPeriod);
    const query = new URLSearchParams(location.search); query.set("platform", nextPlatform); query.set("period", nextPeriod);
    history.pushState(null, "", `${location.pathname}?${query}`);
  }
  // Keep the saved view while fetching instead of flashing zero counts between periods.
  const current = data;
  const stats = current?.stats;
  const provider = platform !== "google-play-music" && platform !== "youtube-music" ? spotify?.ranges[range] : undefined;
  const featured = provider?.tracks[0] || stats?.topTracks[0];
  const rankings = stats ? tab === "artists" ? stats.topArtists : tab === "albums" ? stats.topAlbums : stats.topTracks : [];
  return <>
    <div className="flex flex-col justify-between gap-7 sm:flex-row sm:items-end"><div><p className="music-label mb-5">My music, through time</p><h1 className="page-title">On <em>repeat.</em></h1><p className="mt-6 max-w-[42ch] text-[18px] leading-relaxed text-muted">The songs that stick around. A listening history, one obsession at a time.</p></div><a className="pill w-fit" href="https://open.spotify.com/user/1271912429" target="_blank" rel="noopener noreferrer">Find me on Spotify<span className="sr-only"> (opens in a new tab)</span></a></div>

    <section className="music-feature panel relative grid min-h-[340px] overflow-hidden rounded-[28px] md:grid-cols-[1.05fr_1fr]" aria-label="Featured music">
      <div className="relative z-10 flex flex-col items-start justify-center p-7 sm:p-10 lg:p-12"><MusicSwap identity={featured?.key || "empty"} className="w-full"><p className="music-label">{provider ? "Lately, on repeat" : featured ? "A familiar favorite" : "Every era has a soundtrack"}</p><h2 className="mt-5 max-w-[13ch] font-display text-[clamp(42px,5vw,70px)] leading-[.95] tracking-[-.025em]">{featured?.name || <>Good music.<br /><em className="text-accent">Long memory.</em></>}</h2><p className="mt-4 text-[18px] text-muted">{featured?.artists.join(", ") || "Bringing the listening history together."}</p>{featured && <a className="mt-7 border-b border-ink pb-1 text-[14px] hover:text-accent" href={safeLink(featured.url)} target="_blank" rel="noopener noreferrer">Listen on {featured.url?.includes("spotify") ? "Spotify" : "YouTube Music"}<span className="sr-only"> (opens in a new tab)</span></a>}<p className="mt-6 text-[13px] text-muted">{provider ? "From Spotify’s top tracks for this period." : "A collection across Spotify, Google Play Music, and YouTube Music."}</p></MusicSwap></div>
      <div className="music-record-scene" aria-hidden="true"><div className="music-record"><div className="music-record-label"><MusicSwap identity={featured?.key || "empty"} className="h-full w-full">{featured && safeImage(featured.image) ? <img src={safeImage(featured.image)} alt="" width="220" height="220" /> : <span>j<span className="italic">j.</span></span>}</MusicSwap></div></div><span className="music-record-caption">SIDE A <span>ALWAYS IN ROTATION</span></span></div>
    </section>

    {provider && <section aria-labelledby="music-lately-title"><div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="music-label">The current rotation</p><h2 id="music-lately-title" className="mt-2 font-display text-[42px] leading-none">Heavy <em className="text-accent">rotation.</em></h2></div><label className="music-select-label">Spotify favorites<select value={range} onChange={e => setRange(e.target.value)} className="music-select">{Object.entries(rangeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div><MusicSwap identity={range}><div className="music-album-grid">{provider.tracks.slice(0, 6).map((item, i) => <a key={item.key} className="music-album group" style={{ "--music-order": i } as CSSProperties} href={safeLink(item.url)} target="_blank" rel="noopener noreferrer"><div className="relative"><Cover item={item} className="aspect-square w-full rounded-[14px]" /><span className="music-album-rank">{String(i + 1).padStart(2, "0")}</span></div><h3 className="mt-3 truncate font-medium group-hover:text-accent">{item.name}</h3><p className="mt-1 truncate text-[14px] text-muted">{item.artists.join(", ")}</p><span className="sr-only"> (opens in a new tab)</span></a>)}</div></MusicSwap><p className="mt-4 text-[13px] text-muted">Spotify’s affinity rankings.</p></section>}

    <section aria-labelledby="music-history-title" className="music-history flex flex-wrap items-start justify-between gap-x-5 gap-y-6"><div><p className="music-label">The bigger picture</p><h2 id="music-history-title" className="mt-2 font-display text-[42px] leading-none">Listening <em className="text-accent">history.</em></h2></div><div className="music-history-filters grid grid-cols-2 gap-3" role="group" aria-label="Filter listening history" style={headerHeight === null ? undefined : { "--music-header-offset": `${headerHeight}px` } as CSSProperties}><label className="music-select-label">Platform<select value={platform} onChange={e => filter(e.target.value as MusicPlatform | "all", period)} className="music-select"><option value="all">All platforms</option>{(manifest?.platforms || []).map(p => <option key={p} value={p}>{platformLabels[p]}</option>)}</select></label><label className="music-select-label">Period<select value={period} onChange={e => filter(platform, e.target.value)} className="music-select">{(manifest?.periods || ["30d", "365d", "all"]).map(p => <option key={p} value={p}>{periodLabels[p] || p}</option>)}</select></label></div>
      <div className="flex w-full min-w-0 flex-col gap-6"><div aria-live="polite" className="text-[13px] text-muted">{loading ? "Loading listening history…" : error ? "The latest update is unavailable. Showing the saved collection." : stats?.plays ? `${periodLabels[period] || period} · ${platform === "all" ? "All platforms" : platformLabels[platform]}` : "Historical imports are being collected. The archive will grow as new plays arrive."}</div>
      {stats?.firstListen && stats.lastListen && <p className="text-[13px] text-muted">Available records: {dateLabel(stats.firstListen)} through {dateLabel(stats.lastListen)}.</p>}
      <div aria-busy={loading}><MusicSwap identity={`${current?.platform}:${current?.period}:${current?.generatedAt}`} className="music-history-swap">
        <div className="music-stat-grid">{[["Recorded plays", stats?.plays || 0], ["Different artists", stats?.artists || 0], ["Different tracks", stats?.tracks || 0], ["Measured hours", Math.round((stats?.msPlayed || 0) / 3600000)]].map(([label, value]) => <div key={label} className="panel rounded-[20px] p-5 sm:p-6"><p className="music-label">{label}</p><p className="mt-3 font-display text-[clamp(44px,5vw,64px)] leading-none tabular-nums">{label === "Measured hours" && !stats?.durationKnown ? <span className="text-muted">Pending</span> : number(Number(value))}</p></div>)}</div>
        {current && !!stats?.plays && <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]"><ListeningChart data={current} /><WeekdayChart data={current} /></div>}
        <section className="panel rounded-[24px] p-5 sm:p-7" aria-labelledby="music-ranking-title"><div className="mb-5 flex flex-wrap items-center justify-between gap-4"><h2 id="music-ranking-title" className="font-display text-[36px] leading-none">The <em className="text-accent">favorites.</em></h2><div role="group" aria-label="Rank music by" className="music-tabs">{(["tracks", "artists", "albums"] as const).map(t => <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)} className="capitalize">{t}</button>)}</div></div><MusicSwap identity={`${tab}:${current?.platform}:${current?.period}:${current?.generatedAt}`}>{rankings.length ? <Ranking items={rankings} /> : <p className="py-8 text-muted">{stats?.plays ? "More metadata is needed for this view." : "The first chapters of this collection are still coming in."}</p>}</MusicSwap></section>
      </MusicSwap></div>
      <MusicSeasonChart data={seasons} loading={seasonsLoading} error={seasonsError} />
      </div>
    </section>
    {spotify?.playlists.length ? <section aria-labelledby="music-playlists-title"><p className="music-label">Mixtapes, more or less</p><h2 id="music-playlists-title" className="mt-2 font-display text-[42px]">In the <em className="text-accent">collection.</em></h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{spotify.playlists.slice(0, 9).map(p => <a key={p.id} className="panel flex items-center gap-4 rounded-[18px] p-4 hover:border-accent" href={p.url} target="_blank" rel="noopener noreferrer"><span className="music-playlist-icon" aria-hidden="true">♫</span><span className="min-w-0"><span className="block truncate font-medium">{p.name}</span><span className="mt-1 block text-[13px] text-muted">{number(p.tracks)} tracks · Spotify</span></span><span className="sr-only"> (opens in a new tab)</span></a>)}</div></section> : null}
    <noscript><p className="panel rounded-[20px] p-5">This is the saved music collection. Enable JavaScript to explore other periods and platforms.</p></noscript>
  </>;
}
