import type { MusicPlaybackSnapshot } from "./types.ts";
import { musicTrack, clean } from "./normalize.ts";
import { directSpotifyUrl, spotifyImage } from "./entity-links.ts";

type Row = Record<string, any>;
export interface SpotifyPlaybackSource { checkedAt: string; data: Row | null }
export function publicSpotifyPlayback(source: SpotifyPlaybackSource | null, now = new Date()): MusicPlaybackSnapshot {
  const checked = Date.parse(source?.checkedAt || ""), row = source?.data, item = row?.item;
  const checkedAt = Number.isFinite(checked) ? source!.checkedAt : now.toISOString();
  const unknown: MusicPlaybackSnapshot = { version: 1, checkedAt, status: "unknown", track: null };
  if (!Number.isFinite(checked) || checked > now.getTime() + 5000 || !row) return unknown;
  const stopped: MusicPlaybackSnapshot = { ...unknown, status: "stopped" };
  // A successful empty playback response or an explicit pause confirms playback stopped.
  if (Object.keys(row).length === 0 || row.is_playing === false) return stopped;
  if (row.is_playing !== true) return unknown;
  if (row.device?.is_private_session === true || item?.is_local === true || (row.currently_playing_type && row.currently_playing_type !== "track") || (item?.type && item.type !== "track")) return stopped;
  // Explicit playback state is required. A recent listen or library record never proves current playback.
  if (row.device?.is_private_session !== false || row.currently_playing_type !== "track" || item?.type !== "track") return unknown;
  const name = clean(item.name), artists = (item.artists || []).map((artist: Row) => clean(artist.name)).filter(Boolean);
  if (!name || !artists.length) return unknown;
  // Content exclusions apply to listening summaries, not current playback.
  const track = musicTrack(name, artists, { album: clean(item.album?.name) || null });
  return { version: 1, checkedAt, status: "playing", track: { key: track.key, name, artists, album: track.album, url: directSpotifyUrl(item.external_urls?.spotify || (item.id ? `https://open.spotify.com/track/${item.id}` : null), "track"), image: spotifyImage(item.album?.images?.[0]?.url) || null } };
}
