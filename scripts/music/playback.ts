import { publicSpotifyPlayback, type SpotifyPlaybackSource } from "../../src/lib/music/playback.ts";
import { spotifyImage } from "../../src/lib/music/entity-links.ts";
import { artistGenreKey } from "../../src/lib/music/artist-genres.ts";
import type { MusicManifest, MusicPlaybackSnapshot } from "../../src/lib/music/types.ts";
import { ARTIST_IMAGES_FILE, type ArtistImages } from "./artist-images.ts";
import { readJson, writeJson, type MusicStore } from "./store.ts";
import { spotifyAccessToken } from "./spotify-token.ts";
import { createSpotifyRequester } from "./spotify-request.ts";
import { publicSpotifyRecentTracks } from "../../src/lib/music/recent-tracks.ts";
import { parseArtistGenreCatalog, resolveArtistGenres } from "../../src/lib/music/artist-genres.ts";
import savedArtistGenres from "../../content/artist_genres.json" with { type: "json" };
import type { GenreIndex } from "./spotify.ts";

/** Bootstrap from the old immutable snapshot until the independent worker first publishes. */
export async function savedMusicPlayback(store: MusicStore): Promise<MusicPlaybackSnapshot | null> {
  const current = await readJson<MusicPlaybackSnapshot>(store, "playback.json");
  if (current?.version === 1) return current;
  const manifest = await readJson<MusicManifest>(store, "manifest.json");
  const file = manifest?.files?.playback;
  return file && /^datasets\/[a-f0-9]{24}\.json$/.test(file) ? readJson<MusicPlaybackSnapshot>(store, file) : null;
}

/** One small public write, with no listening partitions, aggregates, or manifest writes. */
export async function publishMusicPlayback(privateStore: MusicStore, publicStore: MusicStore, now = new Date()) {
  let playback = publicSpotifyPlayback(await readJson<SpotifyPlaybackSource>(privateStore, "state/spotify-playback.json"), now);
  if (playback.status === "unknown") playback = await savedMusicPlayback(publicStore) || playback;
  const recentSource = await readJson<SpotifyPlaybackSource>(privateStore, "state/spotify-last-tracks.json");
  if (recentSource) {
    const genres = resolveArtistGenres(await readJson<GenreIndex>(privateStore, "catalog/genres.json") || {}, parseArtistGenreCatalog(savedArtistGenres));
    const recentTracks = publicSpotifyRecentTracks(recentSource, genres, now);
    playback = { ...playback, recentTracks: recentTracks ?? (await savedMusicPlayback(publicStore))?.recentTracks ?? [] };
  } else {
    const prior = await savedMusicPlayback(publicStore);
    if (prior?.recentTracks) playback = { ...playback, recentTracks: prior.recentTracks };
  }
  const images = playback.track ? await readJson<ArtistImages>(privateStore, ARTIST_IMAGES_FILE) : null;
  playback = { ...playback, artistImages: (playback.track?.artists || []).map(name => ({ name, image: spotifyImage(images?.[artistGenreKey(name)]?.images.find(image => spotifyImage(image.url))?.url) || null })) };
  await writeJson(publicStore, "playback.json", playback);
  return playback;
}

export async function collectSpotifyPlayback(privateStore: MusicStore, publicStore: MusicStore, options: { fetch?: typeof fetch } = {}) {
  const token = await spotifyAccessToken(privateStore, options);
  const { request, stats } = await createSpotifyRequester(privateStore, token, new Date().toISOString(), options);
  const [result, recent] = await Promise.all([request("me/player", true), request("me/player/recently-played?limit=50", true)]);
  await writeJson(privateStore, "state/spotify-playback.json", { checkedAt: new Date().toISOString(), data: result?.data || null });
  if (recent) await writeJson(privateStore, "state/spotify-last-tracks.json", { checkedAt: new Date().toISOString(), rawRef: recent.rawRef, data: recent.data });
  const playback = await publishMusicPlayback(privateStore, publicStore);
  return { status: playback.status, requests: stats.requests, unavailable: stats.unavailable };
}
