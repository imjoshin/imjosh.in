"use client";

import { useEffect, useId, useState, type CSSProperties } from "react";
import { platformLabels, type MusicDataset, type MusicManifest, type MusicPlatform, type MusicSeasonalDataset, type RankedMusic, type SpotifySnapshot } from "@/lib/music/types";
import { MusicSwap } from "./music-swap";
import { MusicSeasonChart } from "./music-season-chart";

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

function ListeningChart({ data }: { data: MusicDataset }) {
  const id = useId().replaceAll(":", "");
  const months = data.stats.months;
  const maximum = Math.max(1, ...months.map(m => m.plays));
  const points = months.map((m, i) => `${months.length === 1 ? 300 : 12 + i / (months.length - 1) * 576},${166 - m.plays / maximum * 142}`);
  const line = points.length ? `M ${points.join(" L ")}` : "";
  const first = points[0]?.split(",")[0] || "12", last = points.at(-1)?.split(",")[0] || "588";
  const label = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}-01T12:00:00Z`));
  return <figure className="panel overflow-hidden rounded-[24px] p-5 sm:p-7">
    <figcaption className="flex items-start justify-between gap-4"><div><p className="music-label">The listening curve</p><h2 className="mt-2 font-display text-[36px] leading-none">A little more <em className="text-accent">volume.</em></h2></div><span className="pt-1 text-[13px] text-muted">Recorded plays</span></figcaption>
    <svg viewBox="0 0 600 190" role="img" aria-label={`Recorded listening by month. ${months.map(m => `${label(m.month)}: ${m.plays}`).join(". ")}`} className="mt-7 w-full overflow-visible">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop stopColor="var(--acc)" stopOpacity=".3" /><stop offset="1" stopColor="var(--acc)" stopOpacity="0" /></linearGradient></defs>
      {[24, 95, 166].map(y => <line key={y} x1="12" x2="588" y1={y} y2={y} stroke="var(--line)" strokeDasharray="3 6" />)}
      {line && <><path d={`${line} L ${last},180 L ${first},180 Z`} fill={`url(#${id})`} /><path d={line} fill="none" stroke="var(--acc)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />{months.length <= 24 && points.map((p, i) => <circle key={months[i].month} cx={p.split(",")[0]} cy={p.split(",")[1]} r="3.5" fill="var(--bg)" stroke="var(--acc)" strokeWidth="2"><title>{`${label(months[i].month)}: ${number(months[i].plays)} plays`}</title></circle>)}</>}
    </svg>
    <div className="flex justify-between text-[13px] text-muted"><span>{months[0] ? label(months[0].month) : "History is on its way"}</span><span>{months.length > 1 ? label(months.at(-1)!.month) : ""}</span></div>
    <details className="mt-3 text-[13px] text-muted"><summary className="cursor-pointer">View monthly counts</summary><ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">{months.map(m => <li key={m.month} className="flex justify-between gap-2"><span>{label(m.month)}</span><span>{number(m.plays)}</span></li>)}</ul></details>
  </figure>;
}

interface Props { initialManifest: MusicManifest | null; initialData: MusicDataset | null; initialSpotify: SpotifySnapshot | null; initialSeasons: MusicSeasonalDataset | null }
export function MusicExplorer({ initialManifest, initialData, initialSpotify, initialSeasons }: Props) {
  const [manifest, setManifest] = useState(initialManifest), [data, setData] = useState(initialData), [spotify, setSpotify] = useState(initialSpotify);
  const [platform, setPlatform] = useState<MusicPlatform | "all">("all"), [period, setPeriod] = useState("30d"), [range, setRange] = useState("short_term");
  const [tab, setTab] = useState<"tracks" | "artists" | "albums">("tracks"), [error, setError] = useState(false), [loading, setLoading] = useState(false);
  const [api, setApi] = useState(false);
  const [seasons, setSeasons] = useState(initialSeasons), [seasonsLoading, setSeasonsLoading] = useState(false), [seasonsError, setSeasonsError] = useState(false);
  const read = async <T,>(file: string, useApi: boolean, signal?: AbortSignal): Promise<T> => {
    const response = await fetch(useApi ? `/api/music?file=${encodeURIComponent(file)}` : `/music/${file}`, { signal });
    if (!response.ok) throw new Error("Music data is unavailable");
    return response.json() as Promise<T>;
  };
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
  const maxDay = Math.max(1, ...stats?.weekdays || []);
  return <>
    <div className="flex flex-col justify-between gap-7 sm:flex-row sm:items-end"><div><p className="music-label mb-5">My music, through time</p><h1 className="page-title">On <em>repeat.</em></h1><p className="mt-6 max-w-[42ch] text-[18px] leading-relaxed text-muted">The songs that stick around. A listening history, one obsession at a time.</p></div><a className="pill w-fit" href="https://open.spotify.com/user/1271912429" target="_blank" rel="noopener noreferrer">Find me on Spotify<span className="sr-only"> (opens in a new tab)</span></a></div>

    <section className="music-feature panel relative grid min-h-[340px] overflow-hidden rounded-[28px] md:grid-cols-[1.05fr_1fr]" aria-label="Featured music">
      <div className="relative z-10 flex flex-col items-start justify-center p-7 sm:p-10 lg:p-12"><MusicSwap identity={featured?.key || "empty"} className="w-full"><p className="music-label">{provider ? "Lately, on repeat" : featured ? "A familiar favorite" : "Every era has a soundtrack"}</p><h2 className="mt-5 max-w-[13ch] font-display text-[clamp(42px,5vw,70px)] leading-[.95] tracking-[-.025em]">{featured?.name || <>Good music.<br /><em className="text-accent">Long memory.</em></>}</h2><p className="mt-4 text-[18px] text-muted">{featured?.artists.join(", ") || "Bringing the listening history together."}</p>{featured && <a className="mt-7 border-b border-ink pb-1 text-[14px] hover:text-accent" href={safeLink(featured.url)} target="_blank" rel="noopener noreferrer">Listen on {featured.url?.includes("spotify") ? "Spotify" : "YouTube Music"}<span className="sr-only"> (opens in a new tab)</span></a>}<p className="mt-6 text-[13px] text-muted">{provider ? "From Spotify’s top tracks for this period." : "A collection across Spotify, Google Play Music, and YouTube Music."}</p></MusicSwap></div>
      <div className="music-record-scene" aria-hidden="true"><div className="music-record"><div className="music-record-label"><MusicSwap identity={featured?.key || "empty"} className="h-full w-full">{featured && safeImage(featured.image) ? <img src={safeImage(featured.image)} alt="" width="220" height="220" /> : <span>j<span className="italic">j.</span></span>}</MusicSwap></div></div><span className="music-record-caption">SIDE A <span>ALWAYS IN ROTATION</span></span></div>
    </section>

    {provider && <section aria-labelledby="music-lately-title"><div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="music-label">The current rotation</p><h2 id="music-lately-title" className="mt-2 font-display text-[42px] leading-none">Heavy <em className="text-accent">rotation.</em></h2></div><label className="music-select-label">Spotify favorites<select value={range} onChange={e => setRange(e.target.value)} className="music-select">{Object.entries(rangeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div><MusicSwap identity={range}><div className="music-album-grid">{provider.tracks.slice(0, 6).map((item, i) => <a key={item.key} className="music-album group" style={{ "--music-order": i } as CSSProperties} href={safeLink(item.url)} target="_blank" rel="noopener noreferrer"><div className="relative"><Cover item={item} className="aspect-square w-full rounded-[14px]" /><span className="music-album-rank">{String(i + 1).padStart(2, "0")}</span></div><h3 className="mt-3 truncate font-medium group-hover:text-accent">{item.name}</h3><p className="mt-1 truncate text-[14px] text-muted">{item.artists.join(", ")}</p><span className="sr-only"> (opens in a new tab)</span></a>)}</div></MusicSwap><p className="mt-4 text-[13px] text-muted">Spotify’s affinity rankings. Kids and Disney filtered.</p></section>}

    <section aria-labelledby="music-history-title" className="flex flex-col gap-6"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="music-label">The bigger picture</p><h2 id="music-history-title" className="mt-2 font-display text-[42px] leading-none">Listening <em className="text-accent">history.</em></h2></div><div className="flex flex-wrap gap-3"><label className="music-select-label">Platform<select value={platform} onChange={e => filter(e.target.value as MusicPlatform | "all", period)} className="music-select"><option value="all">All platforms</option>{(manifest?.platforms || []).map(p => <option key={p} value={p}>{platformLabels[p]}</option>)}</select></label><label className="music-select-label">Period<select value={period} onChange={e => filter(platform, e.target.value)} className="music-select">{(manifest?.periods || ["30d", "365d", "all"]).map(p => <option key={p} value={p}>{periodLabels[p] || p}</option>)}</select></label></div></div>
      <div aria-live="polite" className="text-[13px] text-muted">{loading ? "Loading listening history…" : error ? "The latest update is unavailable. Showing the saved collection." : stats?.plays ? `${periodLabels[period] || period} · ${platform === "all" ? "All platforms" : platformLabels[platform]} · Kids and Disney filtered` : "Historical imports are being collected. The archive will grow as new plays arrive."}</div>
      {stats?.firstListen && stats.lastListen && <p className="text-[13px] text-muted">Available records: {dateLabel(stats.firstListen)} through {dateLabel(stats.lastListen)}.</p>}
      <div aria-busy={loading}><MusicSwap identity={`${current?.platform}:${current?.period}:${current?.generatedAt}`} className="music-history-swap">
        <div className="music-stat-grid">{[["Recorded plays", stats?.plays || 0], ["Different artists", stats?.artists || 0], ["Different tracks", stats?.tracks || 0], ["Measured hours", Math.round((stats?.msPlayed || 0) / 3600000)]].map(([label, value]) => <div key={label} className="panel rounded-[20px] p-5 sm:p-6"><p className="music-label">{label}</p><p className="mt-3 font-display text-[clamp(44px,5vw,64px)] leading-none tabular-nums">{label === "Measured hours" && !stats?.durationKnown ? <span className="text-muted">Pending</span> : number(Number(value))}</p></div>)}</div>
        {current && !!stats?.plays && <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]"><ListeningChart data={current} /><figure className="panel flex flex-col rounded-[24px] p-5 sm:p-7"><figcaption><p className="music-label">A weekly rhythm</p><h2 className="mt-2 font-display text-[36px] leading-none">Day by <em className="text-accent">day.</em></h2></figcaption><div className="mt-8 flex min-h-36 flex-1 items-end gap-3">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => <div key={day} className="flex h-full min-h-36 flex-1 flex-col justify-end gap-3 text-center"><div className="music-day-bar" style={{ height: `${Math.max(2, stats.weekdays[i] / maxDay * 120)}px` }} title={`${day}: ${number(stats.weekdays[i])} recorded plays`} role="img" aria-label={`${day}: ${number(stats.weekdays[i])} recorded plays`} /><span className="text-[12px] text-muted">{day}</span></div>)}</div><p className="mt-5 text-[13px] text-muted">Eastern Time.</p></figure></div>}
        <section className="panel rounded-[24px] p-5 sm:p-7" aria-labelledby="music-ranking-title"><div className="mb-5 flex flex-wrap items-center justify-between gap-4"><h2 id="music-ranking-title" className="font-display text-[36px] leading-none">The <em className="text-accent">favorites.</em></h2><div role="group" aria-label="Rank music by" className="music-tabs">{(["tracks", "artists", "albums"] as const).map(t => <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)} className="capitalize">{t}</button>)}</div></div><MusicSwap identity={`${tab}:${current?.platform}:${current?.period}:${current?.generatedAt}`}>{rankings.length ? <Ranking items={rankings} /> : <p className="py-8 text-muted">{stats?.plays ? "More metadata is needed for this view." : "The first chapters of this collection are still coming in."}</p>}</MusicSwap></section>
      </MusicSwap></div>
      <MusicSeasonChart data={seasons} loading={seasonsLoading} error={seasonsError} />
      <p className="max-w-[90ch] text-[13px] leading-relaxed text-muted">Counts reflect available history. Listening time uses measured playback only. Known kids genres, Disney music, and private sessions are excluded; tracks without genre metadata remain unclassified.{stats?.genreUnknown ? ` ${number(stats.genreUnknown)} plays have unclassified genres.` : ""} {manifest?.generatedAt && <>Updated <time dateTime={manifest.generatedAt}>{new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "America/Detroit" }).format(new Date(manifest.generatedAt))}</time>.</>}</p>
    </section>
    {spotify?.playlists.length ? <section aria-labelledby="music-playlists-title"><p className="music-label">Mixtapes, more or less</p><h2 id="music-playlists-title" className="mt-2 font-display text-[42px]">In the <em className="text-accent">collection.</em></h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{spotify.playlists.slice(0, 9).map(p => <a key={p.id} className="panel flex items-center gap-4 rounded-[18px] p-4 hover:border-accent" href={p.url} target="_blank" rel="noopener noreferrer"><span className="music-playlist-icon" aria-hidden="true">♫</span><span className="min-w-0"><span className="block truncate font-medium">{p.name}</span><span className="mt-1 block text-[13px] text-muted">{number(p.tracks)} tracks · Spotify</span></span><span className="sr-only"> (opens in a new tab)</span></a>)}</div></section> : null}
    <noscript><p className="panel rounded-[20px] p-5">This is the saved music collection. Enable JavaScript to explore other periods and platforms.</p></noscript>
  </>;
}
