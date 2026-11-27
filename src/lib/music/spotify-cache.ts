import type { RankedMusic, SpotifySnapshot } from "./types.ts";

export const MUSIC_SPOTIFY_CACHE_KEY = "imjosh.in:music:spotify:v1";
type SpotifyStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const nullableString = (value: unknown) => value === null || typeof value === "string";
function ranked(value: unknown): value is RankedMusic {
  return record(value) && typeof value.key === "string" && typeof value.name === "string"
    && Array.isArray(value.artists) && value.artists.every(artist => typeof artist === "string")
    && nullableString(value.image) && nullableString(value.url)
    && typeof value.plays === "number" && Number.isFinite(value.plays)
    && typeof value.msPlayed === "number" && Number.isFinite(value.msPlayed);
}
function snapshot(value: unknown): value is SpotifySnapshot {
  return record(value) && typeof value.generatedAt === "string" && Number.isFinite(Date.parse(value.generatedAt))
    && record(value.ranges) && Object.values(value.ranges).every(range => record(range)
      && Array.isArray(range.tracks) && range.tracks.every(ranked)
      && Array.isArray(range.artists) && range.artists.every(ranked))
    && Array.isArray(value.playlists) && value.playlists.every(playlist => record(playlist)
      && typeof playlist.id === "string" && typeof playlist.name === "string" && nullableString(playlist.image)
      && typeof playlist.url === "string" && typeof playlist.tracks === "number" && Number.isFinite(playlist.tracks));
}

/** Prefer a newer browser snapshot over the bundled collection without reading storage during SSR. */
export function readCachedMusicSpotify(initial: SpotifySnapshot | null, storage?: SpotifyStorage): SpotifySnapshot | null {
  try {
    const value: unknown = JSON.parse((storage || window.localStorage).getItem(MUSIC_SPOTIFY_CACHE_KEY) || "null");
    if (snapshot(value) && (!initial || Date.parse(value.generatedAt) >= Date.parse(initial.generatedAt))) return value;
  } catch { /* Corrupt or unavailable storage leaves the bundled collection intact. */ }
  return initial;
}

/** Persist only the public snapshot, and avoid rewriting unchanged favorites and artwork. */
export function cacheMusicSpotify(value: SpotifySnapshot | null, storage?: SpotifyStorage): void {
  try {
    const cache = storage || window.localStorage;
    if (value === null) { cache.removeItem(MUSIC_SPOTIFY_CACHE_KEY); return; }
    const encoded = JSON.stringify(value);
    if (cache.getItem(MUSIC_SPOTIFY_CACHE_KEY) !== encoded) cache.setItem(MUSIC_SPOTIFY_CACHE_KEY, encoded);
  } catch { /* Storage restrictions and quota limits must not interrupt live updates. */ }
}
