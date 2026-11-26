import type { MusicPlaybackSnapshot } from "./types.ts";
import { musicTrack, clean } from "./normalize.ts";
import { isExcludedMusic } from "./genres.ts";
import { directSpotifyUrl, spotifyImage } from "./entity-links.ts";

type Row = Record<string, any>;
export interface SpotifyPlaybackSource { checkedAt: string; data: Row | null }
export function publicSpotifyPlayback(source: SpotifyPlaybackSource | null, genres: (name: string) => string[] = () => [], trackGenres: (key: string) => string[] = () => [], excluded: (key: string) => boolean = () => false, now = new Date()): MusicPlaybackSnapshot {
  const checked = Date.parse(source?.checkedAt || ""), row = source?.data, item = row?.item;
  const checkedAt = Number.isFinite(checked) ? source!.checkedAt : now.toISOString();
  const empty: MusicPlaybackSnapshot = { version: 1, checkedAt, expiresAt: checkedAt, track: null };
  // Explicit playback state is required. A recent listen or library record never proves current playback.
  if (!Number.isFinite(checked) || checked > now.getTime() + 5000 || now.getTime() - checked >= 90000 || row?.is_playing !== true || row.device?.is_private_session !== false || row.currently_playing_type !== "track" || item?.type !== "track" || item.is_local === true) return empty;
  const name = clean(item.name), artists = (item.artists || []).map((artist: Row) => clean(artist.name)).filter(Boolean);
  if (!name || !artists.length) return empty;
  const track = musicTrack(name, artists, { album: clean(item.album?.name) || null, genres: [...(item.genres || []), ...(item.album?.genres || []), ...artists.flatMap(genres)], labels: [item.label, item.album?.label, ...(item.album?.copyrights || []).map((value: Row) => value.text)].filter(Boolean) });
  track.genres.push(...trackGenres(track.key));
  if (excluded(track.key) || isExcludedMusic(track)) return empty;
  const remaining = Number.isFinite(item.duration_ms) && Number.isFinite(row.progress_ms) && item.duration_ms > 0 && row.progress_ms >= 0 ? item.duration_ms - row.progress_ms : 90000;
  const expiresAt = new Date(checked + Math.min(90000, Math.max(0, remaining))).toISOString();
  if (Date.parse(expiresAt) <= now.getTime()) return empty;
  return { version: 1, checkedAt, expiresAt, track: { key: track.key, name, artists, album: track.album, url: directSpotifyUrl(item.external_urls?.spotify || (item.id ? `https://open.spotify.com/track/${item.id}` : null), "track"), image: spotifyImage(item.album?.images?.[0]?.url) || null } };
}
