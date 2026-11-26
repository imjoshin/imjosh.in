import { aggregateMusic } from "../../src/lib/music/aggregate.ts";
import { aggregateSeasons } from "../../src/lib/music/seasons.ts";
import { digest, musicTrack } from "../../src/lib/music/normalize.ts";
import { allListens, readJson, writeJson, type MusicStore } from "./store.ts";
import type { GenreIndex } from "./spotify.ts";
import type { MusicManifest, MusicTrack, SpotifySnapshot } from "../../src/lib/music/types.ts";
import { isKidsGenre, isDisneyMusic } from "../../src/lib/music/genres.ts";

export async function publishMusic(privateStore: MusicStore, publicStore: MusicStore, now = new Date()) {
  const excluded = await readJson<Record<string, { reason: string; excludedAt: string }>>(privateStore, "catalog/excluded-imports.json") || {};
  // An explicitly rejected archive remains private, including its normalized events.
  const rows = (await allListens(privateStore)).filter(row => !excluded[row.rawRef.split("#")[0]]);
  const google = await readJson<Record<string, MusicTrack>>(privateStore, "catalog/google-tracks.json.gz") || {};
  const policy = await readJson<{ requireGoogleLibraryMatch?: boolean }>(privateStore, "catalog/music-policy.json");
  for (const listen of rows) {
    const track = listen.platform === "youtube-music" && listen.track.platformId ? google[listen.track.platformId] : null;
    if (track) listen.track = { ...listen.track, ...track, genres: [...new Set([...listen.track.genres, ...track.genres])] };
  }
  const verifiedRows = rows.filter(listen => !policy?.requireGoogleLibraryMatch || listen.platform !== "youtube-music" || !!(listen.track.platformId && google[listen.track.platformId]));
  const genres = await readJson<GenreIndex>(privateStore, "catalog/genres.json") || {};
  const catalog = await readJson<Record<string, any>>(privateStore, "catalog/spotify-tracks.json.gz") || {};
  const metadata = new Map(Object.values(catalog).map(t => [musicTrack(t.name || "", (t.artists || []).map((a: any) => a.name)).key, t]));
  const genreByTrack = new Map<string, Set<string>>();
  const disneyTracks = new Set<string>();
  const catalogTrack = (t: any) => ({ title: t.name || "", artists: (t.artists || []).map((a: any) => a.name || ""), album: t.album?.name || null, labels: [t.label, t.album?.label, ...(t.album?.copyrights || []).map((c: any) => c.text)].filter(Boolean) });
  for (const [key, t] of metadata) if (isDisneyMusic(catalogTrack(t))) disneyTracks.add(key);
  for (const [key, t] of metadata) genreByTrack.set(key, new Set([...(t.genres || []), ...(t.album?.genres || []), ...(t.artists || []).flatMap((a: any) => genres[a.name?.toLowerCase()]?.genres || [])]));
  for (const l of verifiedRows) {
    const t = metadata.get(l.track.key);
    if (t) { l.track.image ||= t.album?.images?.[0]?.url || null; l.track.isrc ||= t.external_ids?.isrc || null; l.track.album ||= t.album?.name || null; l.track.labels = [...new Set([...(l.track.labels || []), ...catalogTrack(t).labels])]; }
    if (isDisneyMusic(l.track)) disneyTracks.add(l.track.key);
    const all = genreByTrack.get(l.track.key) || new Set<string>();
    for (const genre of [...l.track.genres, ...(t?.genres || []), ...(t?.album?.genres || []), ...l.track.artists.flatMap(name => genres[name.toLowerCase()]?.genres || [])]) all.add(genre);
    genreByTrack.set(l.track.key, all);
  }
  for (const l of verifiedRows) l.track.genres = [...genreByTrack.get(l.track.key) || []];
  const result = aggregateMusic(verifiedRows, now);
  // Write immutable payloads first; switch one manifest last so readers never see a partial release.
  const manifest: MusicManifest = { ...result.manifest, files: {} };
  for (const [key, value] of Object.entries({ ...result.datasets, ...aggregateSeasons(verifiedRows, now) })) {
    const file = `datasets/${digest(JSON.stringify(value)).slice(0, 24)}.json`;
    await writeJson(publicStore, file, value); manifest.files[key] = file;
  }
  const spotify = await readJson<SpotifySnapshot>(privateStore, "public/spotify.json");
  if (spotify) {
    const kids = (names: string[]) => names.flatMap(name => genres[name.toLowerCase()]?.genres || []).some(isKidsGenre);
    for (const range of Object.values(spotify.ranges)) {
      range.tracks = range.tracks.filter(t => !kids(t.artists) && !isDisneyMusic({ title: t.name, artists: t.artists }) && !disneyTracks.has(musicTrack(t.name, t.artists).key) && ![...genreByTrack.get(musicTrack(t.name, t.artists).key) || []].some(isKidsGenre));
      range.artists = range.artists.filter(a => !kids([a.name]) && !isDisneyMusic({ artists: [a.name] }));
    }
    // Playlist originals remain private; publish listening and affinity rankings only.
    spotify.playlists = [];
    const file = `datasets/${digest(JSON.stringify(spotify)).slice(0, 24)}.json`; await writeJson(publicStore, file, spotify); manifest.files.spotify = file;
  }
  manifest.notes.push("Tracks with known kids genres and identified Disney music are excluded from all summaries. Unclassified genres remain unknown.", "Seasonal charts retain the union of each season's top five, with full per-season counts. Winter spans December through February and uses the January year.");
  await writeJson(publicStore, "manifest.json", manifest);
  return { listens: verifiedRows.length, datasets: Object.keys(manifest.files).length, manifest };
}
