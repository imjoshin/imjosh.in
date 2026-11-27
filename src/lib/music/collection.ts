import type { MusicArtistHistoryDataset, MusicDataset, MusicManifest, MusicPlaybackSnapshot, MusicSoundtrackDataset, SpotifySnapshot } from "./types.ts";

export interface MusicCollection { manifest: MusicManifest | null; data: MusicDataset | null; spotify: SpotifySnapshot | null; soundtrack: MusicSoundtrackDataset | null; playback: MusicPlaybackSnapshot | null; artistHistory: MusicArtistHistoryDataset | null }
export type MusicJsonReader = <T>(file: string, signal: AbortSignal) => Promise<T>;
/** Load a complete revision before replacing the saved view. Only changed immutable files are downloaded. */
export async function readMusicCollection(read: MusicJsonReader, period: string, signal: AbortSignal, cache: Map<string, unknown>, savedManifest?: MusicManifest | null): Promise<MusicCollection> {
  const manifest = savedManifest || await read<MusicManifest>("manifest.json", signal);
  if (manifest.version !== 1 || !manifest.files || !Array.isArray(manifest.periods)) throw new Error("Unsupported music collection");
  const selected = manifest.periods.includes(period) ? period : "30d";
  const file = manifest.files[`all/${selected}`];
  if (!file) throw new Error("Listening history is unavailable");
  async function load<T>(filename?: string): Promise<T | null> {
    if (!filename) return null;
    if (!/^datasets\/[a-f0-9]{24}\.json$/.test(filename)) throw new Error("Invalid music dataset");
    if (cache.has(filename)) return cache.get(filename) as T;
    const value = await read<T>(filename, signal);
    if (signal.aborted) throw signal.reason;
    cache.set(filename, value);
    while (cache.size > 32) cache.delete(cache.keys().next().value!);
    return value;
  }
  const [data, spotify, soundtrack, playback, artistHistory] = await Promise.all([load<MusicDataset>(file), load<SpotifySnapshot>(manifest.files.spotify), load<MusicSoundtrackDataset>(manifest.files[`all/soundtrack/${selected}`]), load<MusicPlaybackSnapshot>(manifest.files.playback), load<MusicArtistHistoryDataset>(manifest.files["artist-history"])]);
  if (data?.version !== 1 || data.period !== selected || data.platform !== "all") throw new Error("Listening history does not match the selected period");
  if (soundtrack && (soundtrack.version !== 1 || soundtrack.period !== selected || soundtrack.platform !== "all")) throw new Error("Soundtrack history does not match the selected period");
  if (artistHistory && (artistHistory.version !== 1 || artistHistory.period !== "all" || artistHistory.platform !== "all" || !Array.isArray(artistHistory.buckets) || !Array.isArray(artistHistory.groups))) throw new Error("Unsupported artist history");
  if (signal.aborted) throw signal.reason;
  return { manifest, data, spotify, soundtrack, playback, artistHistory };
}

export function currentMusicPlayback(snapshot: MusicPlaybackSnapshot | null, previous: MusicPlaybackSnapshot["track"] = null): MusicPlaybackSnapshot["track"] {
  if (snapshot?.version !== 1) return previous;
  if (snapshot.status === "stopped") return null;
  return snapshot.track || previous;
}
