import type { Listen, MusicRecentTrack } from "./types.ts";
import type { SpotifyPlaybackSource } from "./playback.ts";
import { publicMusicListens } from "./aggregate.ts";
import { spotifyListen } from "./normalize.ts";
import { artistGenreKey } from "./artist-genres.ts";
import { directSpotifyUrl, spotifyImage } from "./entity-links.ts";

/** Only approved display metadata leaves the private archive, without event times or provider context. */
export function recentTracksFromListens(input: Listen[], now = new Date()): MusicRecentTrack[] {
  return publicMusicListens(input, now).filter(listen => listen.platform === "spotify" && listen.track.artists.length).sort((a, b) => Date.parse(b.playedAt) - Date.parse(a.playedAt) || a.id.localeCompare(b.id)).slice(0, 6).map(({ id, track }) => ({ id, key: track.key, name: track.title, artists: track.artists, album: track.album, url: directSpotifyUrl(track.url, "track"), image: spotifyImage(track.image) || null }));
}

/** Null means unavailable; a successful empty response deliberately clears the strip. */
export function publicSpotifyRecentTracks(source: SpotifyPlaybackSource | null, genres: Record<string, { genres: string[] }> = {}, now = new Date()): MusicRecentTrack[] | null {
  const checked = Date.parse(source?.checkedAt || "");
  if (!Number.isFinite(checked) || checked > now.getTime() + 5000 || !Array.isArray(source?.data?.items)) return null;
  const listens: Listen[] = [];
  for (const row of source.data.items) {
    if (!row?.track || row.track.type !== "track" || row.track.is_local === true || row.private_session === true || row.is_private_session === true) continue;
    const listen = spotifyListen(row, "recent-track-metadata");
    if (!listen) continue;
    listen.track.genres.push(...(row.track.album?.genres || []), ...listen.track.artists.flatMap(name => genres[artistGenreKey(name)]?.genres || []));
    listens.push(listen);
  }
  return recentTracksFromListens(listens, now);
}
