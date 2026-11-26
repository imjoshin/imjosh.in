import { createHash } from "node:crypto";
import type { Listen, MusicPlatform, MusicTrack } from "./types.ts";

type Row = Record<string, any>;
export const digest = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
export const clean = (value: unknown): string => typeof value === "string" ? value.normalize("NFKC").trim().replace(/\s+/g, " ") : "";
const keyText = (value: string) => clean(value).toLocaleLowerCase("en-US");
const finiteMs = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
const iso = (value: unknown): string | null => {
  if (typeof value !== "string" || !value.trim()) return null;
  // Spotify account exports use UTC without a suffix. Never use the machine's timezone.
  const text = /^\d{4}-\d\d-\d\d \d\d:\d\d$/.test(value) ? value.replace(" ", "T") + ":00Z" : value;
  const date = new Date(text);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
};

export function musicTrack(title: string, artists: string[], extra: Partial<MusicTrack> = {}): MusicTrack {
  const names = artists.map(clean).filter(Boolean);
  // Metadata identity joins platforms. Keep editions/remixes in titles; never fuzzy-match recordings.
  return { key: digest(`${keyText(title)}|${names.map(keyText).sort().join("|")}`).slice(0, 24), title: clean(title), artists: names, album: null, platformId: null, isrc: null, url: null, image: null, genres: [], ...extra };
}

function event(row: Omit<Listen, "version" | "id">): Listen {
  return { version: 1, id: digest([row.platform, row.track.platformId || row.track.key, row.playedAt, row.timestampKind, row.source === "api" ? "api" : "export"].join("|")), ...row };
}

export function spotifyListen(row: Row, rawRef: string): Listen | null {
  const api = !!row.played_at && !!row.track;
  const t = api ? row.track : row;
  const playedAt = iso(api ? row.played_at : row.ts || row.endTime);
  const podcast = !!row.episode_name;
  const title = api ? clean(t.name) : clean(row.master_metadata_track_name || row.trackName || row.episode_name);
  if (!playedAt || !title) return null;
  const artists = api ? (t.artists || []).map((a: Row) => clean(a.name)) : [clean(row.master_metadata_album_artist_name || row.artistName || row.episode_show_name)].filter(Boolean);
  const uri = clean(api ? t.uri : row.spotify_track_uri || row.spotify_episode_uri) || null;
  const track = musicTrack(title, artists, {
    platformId: uri,
    album: clean(api ? t.album?.name : row.master_metadata_album_album_name) || null,
    isrc: clean(t.external_ids?.isrc) || null,
    url: api ? t.external_urls?.spotify || null : uri ? `https://open.spotify.com/${podcast ? "episode" : "track"}/${uri.split(":").at(-1)}` : null,
    image: api ? t.album?.images?.[0]?.url || null : null,
    genres: [...(Array.isArray(t.genres) ? t.genres : []), ...(api ? (t.artists || []).flatMap((a: Row) => Array.isArray(a.genres) ? a.genres : []) : [])].map(clean).filter(Boolean),
    labels: [t.label, t.album?.label, ...(t.album?.copyrights || []).map((c: Row) => c.text)].map(clean).filter(Boolean),
  });
  return event({ platform: "spotify", playedAt, timestampKind: api ? "start" : "end", timestampPrecision: row.endTime ? "minute" : "second", msPlayed: api ? null : finiteMs(row.ms_played ?? row.msPlayed), trackDurationMs: api ? finiteMs(t.duration_ms) : null, skipped: typeof row.skipped === "boolean" ? row.skipped : null, privateSession: typeof row.incognito_mode === "boolean" ? row.incognito_mode : null, media: podcast ? "podcast" : "music", track, source: api ? "api" : row.ts ? "extended-export" : "account-export", rawRef });
}

export function googleListen(row: Row, rawRef: string, filename = ""): Listen | null {
  const playedAt = iso(row.time || row.timestamp);
  // The shared "YouTube and YouTube Music" folder also contains ordinary video watches.
  const context = /youtube\s+and\s+youtube\s+music/i.test(filename) ? "" : filename;
  const label = [row.header, ...(row.products || []), context].map(clean).join(" ");
  const gpm = /google[ _-]?play[ _-]?music/i.test(label);
  const ytm = /youtube[ _-]?music/i.test(label) || /music\.youtube\.com/.test(row.titleUrl || "");
  if (!playedAt || (!gpm && !ytm) || !/^(Watched|Listened to|Played) /i.test(row.title || "")) return null;
  const title = clean(row.title).replace(/^(Watched|Listened to|Played) /i, "");
  if (!title) return null;
  // YouTube channel names are uploader metadata, not verified recording artists.
  const artist = gpm ? clean(row.subtitles?.[0]?.name || row.artist) : "";
  const url = clean(row.titleUrl) || null;
  let platformId: string | null = null;
  try { platformId = url ? new URL(url).searchParams.get("v") : null; } catch { /* Retain original in raw archive. */ }
  return event({ platform: gpm ? "google-play-music" : "youtube-music", playedAt, timestampKind: "activity", timestampPrecision: "second", msPlayed: finiteMs(row.msPlayed), trackDurationMs: null, skipped: null, privateSession: null, media: "music", track: musicTrack(title, artist ? [artist] : [], { platformId, url, genres: (Array.isArray(row.genres) ? row.genres : []).map(clean).filter(Boolean) }), source: "takeout", rawRef });
}

/** Library membership supplies verified recording metadata, never a dated listening event. */
export function googleLibraryTrack(row: Row, filename: string): MusicTrack | null {
  if (!/music \(library and uploads\)\/(?:music library songs|music uploads metadata)\.csv$/i.test(filename.replaceAll("\\", "/"))) return null;
  const title = clean(row["Song Title"]); if (!title) return null;
  const artists = Object.keys(row).filter(key => /^Artist Name \d+$/.test(key)).sort((a, b) => Number(a.split(" ").at(-1)) - Number(b.split(" ").at(-1))).map(key => clean(row[key])).filter(Boolean);
  const id = clean(row["Video ID"]) || null;
  return musicTrack(title, artists, { album: clean(row["Album Title"]) || null, platformId: id, url: id ? `https://music.youtube.com/watch?v=${encodeURIComponent(id)}` : null, genres: clean(row.Genre) ? [clean(row.Genre)] : [] });
}

export function deduplicate(listens: Listen[]): Listen[] {
  const priority = { "extended-export": 4, takeout: 3, "account-export": 2, api: 1 };
  const unique = new Map<string, Listen>();
  for (const listen of listens) {
    const previous = unique.get(listen.id);
    if (!previous || priority[listen.source] > priority[previous.source]) unique.set(listen.id, listen);
  }
  return [...unique.values()].sort((a, b) => a.playedAt.localeCompare(b.playedAt) || a.id.localeCompare(b.id));
}

/** Exports are authoritative inside their coverage window; raw API history is still retained. */
export function aggregationListens(listens: Listen[]): Listen[] {
  const extended = listens.filter(l => l.platform === "spotify" && l.source === "extended-export");
  const allExports = listens.filter(l => l.platform === "spotify" && l.source !== "api");
  // Avoid argument limits for multi-year exports.
  const bounds = (rows: Listen[]) => rows.reduce<[number, number] | null>((b, l) => { const t = Date.parse(l.playedAt); return b ? [Math.min(b[0], t - (l.msPlayed || 0)), Math.max(b[1], t)] : [t - (l.msPlayed || 0), t]; }, null);
  const e = bounds(extended), a = bounds(allExports);
  return deduplicate(listens).filter(l => {
    if (l.platform !== "spotify") return true;
    const time = Date.parse(l.playedAt);
    if (l.source === "api" && a && time >= a[0] && time <= a[1]) return false;
    if (l.source === "account-export" && e && time >= e[0] && time <= e[1]) return false;
    return true;
  });
}

export function platformFrom(value: string): MusicPlatform | null {
  return ["spotify", "google-play-music", "youtube-music"].includes(value) ? value as MusicPlatform : null;
}
