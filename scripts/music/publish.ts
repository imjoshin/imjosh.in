import { aggregateMusic } from "../../src/lib/music/aggregate.ts";
import { aggregateSoundtrackSongs, aggregateSoundtrack } from "../../src/lib/music/soundtrack.ts";
import { digest, musicTrack } from "../../src/lib/music/normalize.ts";
import { allListens, readJson, writeJson, type MusicStore } from "./store.ts";
import type { GenreIndex } from "./spotify.ts";
import type { MusicEntity, MusicSongsDataset, MusicManifest, MusicPlaybackSnapshot, MusicTrack, SpotifySnapshot } from "../../src/lib/music/types.ts";
import { isKidsGenre, isDisneyMusic } from "../../src/lib/music/genres.ts";
import { aggregateEntities, type MusicEntityMetadata } from "../../src/lib/music/entities.ts";
import type { MusicEntityRef } from "../../src/lib/music/types.ts";
import { musicEntityKey } from "../../src/lib/music/entity-links.ts";
import { publicSpotifyPlayback, type SpotifyPlaybackSource } from "../../src/lib/music/playback.ts";
import savedArtistGenres from "../../content/artist_genres.json" with { type: "json" };
import { artistGenreKey, normalizeArtistGenres, parseArtistGenreCatalog, resolveArtistGenres, type ArtistGenreCatalog } from "../../src/lib/music/artist-genres.ts";

export async function publishMusic(privateStore: MusicStore, publicStore: MusicStore, now = new Date(), artistGenreCatalog: ArtistGenreCatalog = parseArtistGenreCatalog(savedArtistGenres)) {
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
  const spotifyGenres = await readJson<GenreIndex>(privateStore, "catalog/genres.json") || {};
  const genres = resolveArtistGenres(spotifyGenres, artistGenreCatalog);
  const catalog = await readJson<Record<string, any>>(privateStore, "catalog/spotify-tracks.json.gz") || {};
  const metadata = new Map(Object.values(catalog).map(t => [musicTrack(t.name || "", (t.artists || []).map((a: any) => a.name)).key, t]));
  const genreByTrack = new Map<string, Set<string>>();
  const disneyTracks = new Set<string>();
  const catalogTrack = (t: any) => ({ title: t.name || "", artists: (t.artists || []).map((a: any) => a.name || ""), album: t.album?.name || null, labels: [t.label, t.album?.label, ...(t.album?.copyrights || []).map((c: any) => c.text)].filter(Boolean) });
  for (const [key, t] of metadata) if (isDisneyMusic(catalogTrack(t))) disneyTracks.add(key);
  for (const [key, t] of metadata) genreByTrack.set(key, new Set([...(t.genres || []), ...(t.album?.genres || []), ...(t.artists || []).flatMap((a: any) => genres[artistGenreKey(a.name || "")]?.genres || [])]));
  for (const l of verifiedRows) {
    const t = metadata.get(l.track.key);
    if (t) { l.track.image ||= t.album?.images?.[0]?.url || null; l.track.isrc ||= t.external_ids?.isrc || null; l.track.album ||= t.album?.name || null; l.track.albumArtists = t.album?.artists?.map((a: any) => a.name).filter(Boolean) || l.track.albumArtists; l.track.labels = [...new Set([...(l.track.labels || []), ...catalogTrack(t).labels])]; }
    if (isDisneyMusic(l.track)) disneyTracks.add(l.track.key);
    const all = genreByTrack.get(l.track.key) || new Set<string>();
    for (const genre of [...l.track.genres, ...(t?.genres || []), ...(t?.album?.genres || []), ...l.track.artists.flatMap(name => genres[artistGenreKey(name)]?.genres || [])]) all.add(genre);
    genreByTrack.set(l.track.key, all);
  }
  for (const [key, values] of genreByTrack) genreByTrack.set(key, new Set(normalizeArtistGenres([...values])));
  for (const l of verifiedRows) l.track.genres = [...genreByTrack.get(l.track.key) || []];
  const result = aggregateMusic(verifiedRows, now);
  // Write immutable payloads first; switch one manifest last so readers never see a partial release.
  const manifest: MusicManifest = { ...result.manifest, files: {} };
  const previous = await readJson<MusicManifest>(publicStore, "manifest.json");
  async function immutable(key: string, value: object) {
    const priorFile = previous?.files[key];
    if (priorFile && /^datasets\/[a-f0-9]{24}\.json$/.test(priorFile)) {
      const prior = await readJson<Record<string, unknown>>(publicStore, priorFile);
      if (prior && JSON.stringify({ ...prior, generatedAt: undefined }) === JSON.stringify({ ...value, generatedAt: undefined })) { manifest.files[key] = priorFile; return priorFile; }
    }
    const file = `datasets/${digest(JSON.stringify(value)).slice(0, 24)}.json`;
    await writeJson(publicStore, file, value); manifest.files[key] = file; return file;
  }
  const spotify = await readJson<SpotifySnapshot>(privateStore, "public/spotify.json");
  const favorites: MusicEntityRef[] = [];
  const entityMetadata: MusicEntityMetadata[] = [];
  // Whitelist recording metadata. The entity publisher never serializes catalog/provider payloads.
  for (const t of Object.values(catalog)) {
    const names = (t.artists || []).map((a: any) => a.name).filter(Boolean);
    const albumCredits = t.album?.artists?.map((a: any) => a.name).filter(Boolean) || [];
    const albumArtists = albumCredits.length ? albumCredits : names;
    entityMetadata.push({ kind: "track", name: t.name || "", artists: names, url: t.external_urls?.spotify || (t.id ? `https://open.spotify.com/track/${t.id}` : null), image: t.album?.images?.[0]?.url, genres: [...genreByTrack.get(musicTrack(t.name || "", names).key) || []], album: t.album?.name, albumArtists });
    if (t.album?.name) entityMetadata.push({ kind: "album", name: t.album.name, artists: albumArtists, url: t.album.external_urls?.spotify || (t.album.id ? `https://open.spotify.com/album/${t.album.id}` : null), image: t.album.images?.[0]?.url, genres: normalizeArtistGenres(t.album.genres || []) });
    for (const a of t.artists || []) if (a.name) entityMetadata.push({ kind: "artist", name: a.name, url: a.external_urls?.spotify || (a.id ? `https://open.spotify.com/artist/${a.id}` : null), genres: genres[artistGenreKey(a.name)]?.genres || [] });
  }
  for (const [name, item] of Object.entries(spotifyGenres)) if (item.artistId) entityMetadata.push({ kind: "artist", name, url: `https://open.spotify.com/artist/${item.artistId}`, genres: genres[artistGenreKey(name)]?.genres || [] });
  for (const [key, item] of Object.entries(artistGenreCatalog.artists)) if (item.spotifyArtistId) entityMetadata.push({ kind: "artist", name: item.name, url: `https://open.spotify.com/artist/${item.spotifyArtistId}`, genres: genres[key]?.genres || [] });
  if (spotify) {
    const kids = (names: string[]) => names.flatMap(name => genres[artistGenreKey(name)]?.genres || []).some(isKidsGenre);
    for (const range of Object.values(spotify.ranges)) {
      range.tracks = range.tracks.filter(t => !kids(t.artists) && !isDisneyMusic({ title: t.name, artists: t.artists }) && !disneyTracks.has(musicTrack(t.name, t.artists).key) && ![...genreByTrack.get(musicTrack(t.name, t.artists).key) || []].some(isKidsGenre));
      range.artists = range.artists.filter(a => !kids([a.name]) && !isDisneyMusic({ artists: [a.name] }));
      favorites.push(...range.tracks.map(t => ({ kind: "track" as const, name: t.name, artists: t.artists, url: t.url, image: t.image })), ...range.artists.map(a => ({ kind: "artist" as const, name: a.name, url: a.url, image: a.image })));
      entityMetadata.push(...range.artists.map(a => ({ kind: "artist" as const, name: a.name, url: a.url, image: a.image, genres: genres[artistGenreKey(a.name)]?.genres || [] })));
    }
    // Playlist originals remain private; publish listening and affinity rankings only.
    spotify.playlists = [];
    await immutable("spotify", spotify);
  }
  let playback = publicSpotifyPlayback(await readJson<SpotifyPlaybackSource>(privateStore, "state/spotify-playback.json"), now);
  if (playback.status === "unknown" && previous?.files.playback && /^datasets\/[a-f0-9]{24}\.json$/.test(previous.files.playback)) {
    const prior = await readJson<MusicPlaybackSnapshot>(publicStore, previous.files.playback);
    if (prior?.version === 1) playback = prior;
  }
  if (playback.track) favorites.push({ kind: "track", ...playback.track });
  await immutable("playback", playback);
  const entities = aggregateEntities(verifiedRows, favorites, entityMetadata, now);
  for (const dataset of Object.values(result.datasets)) {
    for (const [kind, ranked] of [["track", dataset.stats.topTracks], ["artist", dataset.stats.topArtists], ["album", dataset.stats.topAlbums]] as const) {
      for (const item of ranked) {
        const entity = entities.entities[musicEntityKey(kind, item.name, item.artists)];
        if (entity) { item.url = entity.url || null; if (kind === "artist") item.image = entity.image || null; }
      }
    }
  }
  const soundtrack = aggregateSoundtrack(verifiedRows, now);
  const songGroups = aggregateSoundtrackSongs(verifiedRows, soundtrack, now);
  for (const [key, dataset] of Object.entries(soundtrack)) {
    dataset.songFiles = { genres: {}, artists: {}, albums: {} };
    for (const metric of ["genres", "artists", "albums"] as const) {
      for (const line of dataset.metrics[metric].series) {
        const tracks = songGroups[key][metric][line.key] || [];
        const details: Record<string, MusicEntity> = {};
        for (const track of tracks) {
          const entity = entities.entities[track.key];
          if (!entity) continue;
          details[entity.key] = entity;
          for (const artist of entity.artists || []) {
            const artistKey = musicEntityKey("artist", artist);
            if (entities.entities[artistKey]) details[artistKey] = entities.entities[artistKey];
          }
        }
        const payload: MusicSongsDataset = { version: 1, generatedAt: now.toISOString(), period: dataset.period, metric, key: line.key, tracks, entities: details };
        dataset.songFiles[metric]![line.key] = await immutable(`${key}/${metric.slice(0, -1)}/${digest(line.key).slice(0, 24)}`, payload);
      }
    }
  }
  for (const dataset of Object.values(soundtrack)) for (const metric of ["artists", "albums"] as const) for (const line of dataset.metrics[metric].series) line.url = entities.entities[musicEntityKey(metric === "artists" ? "artist" : "album", line.name, line.artists)]?.url || null;
  for (const [key, value] of Object.entries({ ...result.datasets, ...soundtrack })) {
    await immutable(key, value);
  }
  // Count the complete approved history, but send hover details only for displayed music.
  const visible = new Set<string>();
  function include(ref: MusicEntityRef) {
    const key = musicEntityKey(ref.kind, ref.name, ref.artists);
    if (visible.has(key)) return;
    visible.add(key);
    for (const name of ref.artists || []) include({ kind: "artist", name });
    const entity = entities.entities[key];
    if (entity?.album) include({ kind: "album", name: entity.album, artists: entity.albumArtists?.length ? entity.albumArtists : ref.artists });
  }
  for (const ref of favorites) include(ref);
  for (const dataset of Object.values(result.datasets)) {
    for (const [kind, ranked] of [["track", dataset.stats.topTracks], ["artist", dataset.stats.topArtists], ["album", dataset.stats.topAlbums]] as const) {
      for (const item of ranked) include({ kind, ...item });
    }
  }
  for (const dataset of Object.values(soundtrack)) for (const metric of ["artists", "albums"] as const) {
    for (const line of dataset.metrics[metric].series) include({ kind: metric === "artists" ? "artist" : "album", ...line });
  }
  await immutable("entities", { ...entities, entities: Object.fromEntries(Object.entries(entities.entities).filter(([key]) => visible.has(key))) });
  manifest.notes.push("Tracks with known kids genres and identified Disney music are excluded from all summaries. Unclassified genres remain unknown.", "Soundtrack charts follow the selected listening period: daily for the last 30 days, monthly for the last year or a calendar year, and yearly for all time. Each bucket contributes its top five, with single plays qualifying for the last 30 days and at least 11 plays required for other periods. Song files retain all approved matching plays in the selected window, including low-volume buckets.");
  await writeJson(publicStore, "manifest.json", manifest);
  return { listens: verifiedRows.length, datasets: Object.keys(manifest.files).length, manifest };
}
