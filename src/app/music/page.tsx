import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { MusicExplorer } from "@/components/music-explorer";
import type { MusicArtistHistoryDataset, MusicDataset, MusicManifest, MusicPlaybackSnapshot, MusicRecommendationsDataset, MusicSoundtrackDataset, SpotifySnapshot } from "@/lib/music/types";

export const metadata: Metadata = { title: "Music", description: "Josh Johnson’s music collection, current favorites, and listening history across platforms.", alternates: { canonical: "/music/" } };
async function saved<T>(file: string): Promise<T | null> {
  if (file !== "manifest.json" && !/^datasets\/[a-f0-9]{24}\.json$/.test(file)) return null;
  try { return JSON.parse(await readFile(join(process.cwd(), "public/music", file), "utf8")) as T; } catch { return null; }
}
export default async function MusicPage() {
  const manifest = await saved<MusicManifest>("manifest.json");
  const data = manifest?.files["all/30d"] ? await saved<MusicDataset>(manifest.files["all/30d"]) : null;
  const spotify = manifest?.files.spotify ? await saved<SpotifySnapshot>(manifest.files.spotify) : null;
  const soundtrack = manifest?.files["all/soundtrack/30d"] ? await saved<MusicSoundtrackDataset>(manifest.files["all/soundtrack/30d"]) : null;
  const artistHistory = manifest?.files["artist-history"] ? await saved<MusicArtistHistoryDataset>(manifest.files["artist-history"]) : null;
  const recommendations = manifest?.files.recommendations ? await saved<MusicRecommendationsDataset>(manifest.files.recommendations) : null;
  const playback = await saved<MusicPlaybackSnapshot>("playback.json");
  const bundledPlayback = manifest?.files.playback ? await saved<MusicPlaybackSnapshot>(manifest.files.playback) : null;
  return <main id="main" className="music-page relative z-10 mx-auto flex w-full max-w-[1240px] flex-1 flex-col gap-12 px-gutter pt-[clamp(24px,5vw,72px)] pb-16"><MusicExplorer initialManifest={manifest} initialData={data} initialSpotify={spotify} initialSoundtrack={soundtrack} initialArtistHistory={artistHistory} initialRecommendations={recommendations} initialRecentTracks={playback?.recentTracks ?? bundledPlayback?.recentTracks ?? []} /></main>;
}
