import { artistGenreKey, parseArtistGenreCatalog } from "../../src/lib/music/artist-genres.ts";
import { publicMusicListens } from "../../src/lib/music/aggregate.ts";
import { clean } from "../../src/lib/music/normalize.ts";
import { spotifyImage } from "../../src/lib/music/entity-links.ts";
import { publicSpotifyPlayback, type SpotifyPlaybackSource } from "../../src/lib/music/playback.ts";
import type { MusicTrack } from "../../src/lib/music/types.ts";
import savedArtistGenres from "../../content/artist_genres.json" with { type: "json" };
import { allListens, readJson, writeJson, type MusicStore } from "./store.ts";
import type { GenreIndex } from "./spotify.ts";
import type { SpotifyRequest } from "./spotify-request.ts";

type Row = Record<string, any>;
export const ARTIST_IMAGES_FILE = "catalog/artist_images.json";
export interface ArtistImageEntry {
  name: string;
  spotifyArtistId: string;
  images: { url: string; width: number | null; height: number | null }[];
  updatedAt: string;
}
export type ArtistImages = Record<string, ArtistImageEntry>;
const sameArtistName = (a: string, b: string) => artistGenreKey(a.replaceAll("&", " and ")).replace(/\s+/g, " ") === artistGenreKey(b.replaceAll("&", " and ")).replace(/\s+/g, " ");

export function mergeArtistImages(...catalogs: ArtistImages[]): ArtistImages {
  const result: ArtistImages = {};
  for (const catalog of catalogs) for (const [key, entry] of Object.entries(catalog)) {
    if (entry.images.some(image => spotifyImage(image.url)) && (!result[key] || entry.updatedAt >= result[key].updatedAt)) result[key] = entry;
  }
  return result;
}

/** An empty provider response never erases a previously usable photo. */
export function rememberArtistImages(catalog: ArtistImages, artist: Row, updatedAt: string) {
  const name = clean(artist.name), key = artistGenreKey(name);
  const images = (Array.isArray(artist.images) ? artist.images : []).filter((image: Row) => spotifyImage(image?.url)).map((image: Row) => ({ url: image.url as string, width: typeof image.width === "number" ? image.width : null, height: typeof image.height === "number" ? image.height : null }));
  if (!key || !artist.id || !images.length) return false;
  catalog[key] = { name, spotifyArtistId: artist.id, images, updatedAt };
  return true;
}

export async function collectArtistImages(store: MusicStore, observed: Row[], request: SpotifyRequest, now = new Date()) {
  const [listens, tracks, genres, saved, attempts, excluded, playback, google, policy] = await Promise.all([
    allListens(store), readJson<Record<string, Row>>(store, "catalog/spotify-tracks.json.gz"), readJson<GenreIndex>(store, "catalog/genres.json"),
    readJson<ArtistImages>(store, ARTIST_IMAGES_FILE), readJson<Record<string, { retryAt: number; active?: boolean }>>(store, "state/artist-images.json"),
    readJson<Record<string, unknown>>(store, "catalog/excluded-imports.json"), readJson<SpotifyPlaybackSource>(store, "state/spotify-playback.json"),
    readJson<Record<string, MusicTrack>>(store, "catalog/google-tracks.json.gz"), readJson<{ requireGoogleLibraryMatch?: boolean }>(store, "catalog/music-policy.json"),
  ]);
  const catalog = saved || {}, retries = attempts || {}, candidates = new Map<string, { name: string; plays: number; active: boolean }>();
  const remember = (name: string) => {
    const key = artistGenreKey(name);
    if (!key) return null;
    let item = candidates.get(key);
    if (!item) { item = { name: clean(name), plays: 0, active: false }; candidates.set(key, item); }
    return item;
  };
  const rows = listens.filter(row => !excluded?.[row.rawRef.split("#")[0]]).flatMap(row => {
    if (row.platform !== "youtube-music") return [row];
    const track = row.track.platformId ? google?.[row.track.platformId] : null;
    return track ? [{ ...row, track }] : policy?.requireGoogleLibraryMatch ? [] : [row];
  });
  for (const row of publicMusicListens(rows, now)) {
    const seen = new Set<string>();
    for (const name of row.track.artists) {
      const key = artistGenreKey(name);
      if (seen.has(key)) continue;
      seen.add(key);
      const item = remember(name); if (item) item.plays++;
    }
  }
  const active = publicSpotifyPlayback(playback, now).track;
  if (active) for (const name of active.artists) { const item = remember(name); if (item) { item.name = name; item.active = true; } }

  const known = new Map<string, Row>();
  const identify = (artist: Row) => {
    const key = artistGenreKey(clean(artist.name));
    if (key && artist.id) known.set(key, { ...known.get(key), ...artist });
  };
  for (const entry of Object.values(catalog)) identify({ name: entry.name, id: entry.spotifyArtistId });
  for (const [name, entry] of Object.entries(genres || {})) if (entry.artistId) identify({ name, id: entry.artistId });
  for (const entry of Object.values(parseArtistGenreCatalog(savedArtistGenres).artists)) if (entry.spotifyArtistId) identify({ name: entry.name, id: entry.spotifyArtistId });
  for (const track of Object.values(tracks || {})) for (const artist of track.artists || []) identify(artist);
  // Archived ranking photos can bootstrap the catalog without another API call.
  for (const range of ["short_term", "medium_term", "long_term"]) {
    const snapshot = await readJson<{ fetchedAt: string; artists: Row[] }>(store, `snapshots/spotify/${range}.json`);
    for (const artist of snapshot?.artists || []) {
      identify(artist);
      const key = artistGenreKey(clean(artist.name)), candidate = candidates.get(key);
      if (candidate && (candidate.plays > 50 || candidate.active) && !catalog[key]) rememberArtistImages(catalog, artist, snapshot!.fetchedAt);
    }
  }
  for (const artist of observed) identify(artist);
  if (active) for (const artist of playback?.data?.item?.artists || []) identify(artist);
  const eligible = new Set([...candidates].filter(([, item]) => item.plays > 50 || item.active).map(([key]) => key));
  let requested = 0;
  for (const [key, candidate] of [...candidates].filter(([key]) => eligible.has(key)).sort((a, b) => Number(b[1].active) - Number(a[1].active) || b[1].plays - a[1].plays || a[0].localeCompare(b[0]))) {
    let artist = known.get(key);
    // Only fresh observations overwrite saved values. Missing images fall back to the file.
    const fresh = observed.findLast(item => sameArtistName(clean(item.name), candidate.name) && item.images?.some((image: Row) => spotifyImage(image?.url)));
    if (fresh) { rememberArtistImages(catalog, { ...fresh, name: candidate.name }, now.toISOString()); delete retries[key]; continue; }
    if (catalog[key]?.images.some(image => spotifyImage(image.url))) continue;
    if ((retries[key]?.retryAt || 0) > now.getTime() && (!candidate.active || retries[key].active)) continue;
    requested++;
    if (!artist?.id) {
      let result = await request(`search?${new URLSearchParams({ q: `artist:"${candidate.name}"`, type: "artist", limit: "10" })}`, true);
      if (result?.data.artists?.items?.length === 0) result = await request(`search?${new URLSearchParams({ q: candidate.name, type: "artist", limit: "10" })}`, true);
      const matches = (result?.data.artists?.items || []).filter((item: Row) => sameArtistName(clean(item.name), candidate.name));
      if (matches.length === 1) artist = matches[0];
    }
    const detail = artist?.id ? await request(`artists/${encodeURIComponent(artist.id)}`, true) : null;
    const supplied = detail && sameArtistName(clean(detail.data.name), candidate.name) ? { ...detail.data, name: candidate.name } : null;
    if (supplied && rememberArtistImages(catalog, supplied, now.toISOString())) { observed.push(supplied); delete retries[key]; }
    else retries[key] = { retryAt: now.getTime() + (detail ? 24 * 3600000 : candidate.active ? 60000 : 15 * 60000), active: candidate.active };
    // Checkpoint each successful lookup, including before another artist hits a limit.
    if (catalog[key]) await writeJson(store, ARTIST_IMAGES_FILE, catalog);
  }
  await writeJson(store, ARTIST_IMAGES_FILE, catalog);
  await writeJson(store, "state/artist-images.json", retries);
  return { catalog, eligible, requested };
}
