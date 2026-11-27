import { strict as assert } from "node:assert";
import { test } from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { zipSync, strToU8 } from "fflate";
import { spotifyListen, googleListen, googleLibraryTrack, musicTrack, deduplicate, aggregationListens, digest } from "../src/lib/music/normalize.ts";
import { aggregateMusic } from "../src/lib/music/aggregate.ts";
import { isKidsGenre, isDisneyMusic } from "../src/lib/music/genres.ts";
import { aggregateSeasons, musicSeason } from "../src/lib/music/seasons.ts";
import { importMusic } from "../scripts/music/import.ts";
import { localStore, allListens, readJson, writeJson, saveListens } from "../scripts/music/store.ts";
import { publishMusic } from "../scripts/music/publish.ts";
import type { Listen, MusicDataset, MusicEntityDataset, MusicManifest, MusicSeasonalDataset } from "../src/lib/music/types.ts";

const exportRow = { ts: "2026-06-02T15:03:00Z", ms_played: 180000, master_metadata_track_name: "A Song", master_metadata_album_artist_name: "An Artist", master_metadata_album_album_name: "An Album", spotify_track_uri: "spotify:track:abc123", ip_addr: "PRIVATE-IP", username: "PRIVATE-NAME" };
const listen = (overrides: Partial<Listen> = {}): Listen => ({ ...spotifyListen(exportRow, "private/source")!, ...overrides });
const now = new Date("2026-06-03T12:00:00Z");

test("Spotify exports and API records preserve actual duration versus track length", () => {
  const exported = spotifyListen(exportRow, "archive")!;
  assert.equal(exported.msPlayed, 180000); assert.equal(exported.timestampKind, "end");
  const api = spotifyListen({ played_at: "2026-06-02T15:00:00Z", track: { name: "A Song", uri: "spotify:track:abc123", duration_ms: 190000, artists: [{ name: "An Artist" }] } }, "api")!;
  assert.equal(api.msPlayed, null); assert.equal(api.trackDurationMs, 190000);
  assert.equal(api.track.key, exported.track.key);
  assert.equal(spotifyListen({ ...exportRow, ts: "invalid" }, "archive"), null);
  assert.equal(spotifyListen({ ...exportRow, ts: null }, "archive"), null);
  assert.deepEqual(spotifyListen({ ...exportRow, genres: ["children's music"] }, "archive")!.track.genres, ["children's music"]);
});

test("account export timestamps are UTC and keep minute precision", () => {
  const row = spotifyListen({ endTime: "2021-03-14 06:30", trackName: "A Song", artistName: "An Artist", msPlayed: 12 }, "account")!;
  assert.equal(row.playedAt, "2021-03-14T06:30:00.000Z"); assert.equal(row.timestampPrecision, "minute");
});

test("Google music events normalize into the same track identity without inventing artists", () => {
  const row = googleListen({ header: "Google Play Music", time: "2020-01-02T12:00:00Z", title: "Listened to A Song", subtitles: [{ name: "An Artist" }] }, "gpm")!;
  assert.equal(row.platform, "google-play-music"); assert.equal(row.track.key, listen().track.key); assert.equal(row.msPlayed, null);
  const youtube = googleListen({ header: "YouTube Music", time: "2026-06-01T12:00:00Z", title: "Watched A Song", subtitles: [{ name: "Some uploader" }], titleUrl: "https://music.youtube.com/watch?v=123" }, "yt")!;
  assert.deepEqual(youtube.track.artists, []); assert.equal(youtube.track.platformId, "123");
  assert.equal(googleListen({ header: "YouTube", time: "2026-06-01", title: "Watched a tutorial", titleUrl: "https://www.youtube.com/watch?v=abc" }, "history"), null);
  assert.equal(googleListen({ header: "YouTube Music", time: "2026-06-01", title: "Searched for a song" }, "history"), null);
  const mixedFolder = "Takeout/YouTube and YouTube Music/history/watch-history.json";
  assert.equal(googleListen({ header: "YouTube", products: ["YouTube"], time: "2026-06-01", title: "Watched a tutorial", titleUrl: "https://www.youtube.com/watch?v=abc" }, "history", mixedFolder), null);
  assert.equal(googleListen({ header: "YouTube Music", products: ["YouTube"], time: "2026-06-01", title: "Watched A Song" }, "history", mixedFolder)!.platform, "youtube-music");
  assert.equal(googleListen({ time: "2020-01-02", title: "Listened to A Song", artist: "An Artist" }, "history", "Takeout/Google Play Music/history.json")!.platform, "google-play-music");
  const library = googleLibraryTrack({ "Song Title": "A Song", "Album Title": "An Album", "Artist Name 1": "An Artist", "Video ID": "123" }, "Takeout/YouTube and YouTube Music/music (library and uploads)/music library songs.csv")!;
  assert.equal(library.key, listen().track.key);
  assert.equal(library.platformId, "123");
  assert.equal(googleLibraryTrack({ "Song Title": "A Song" }, "playlists/list.csv"), null);
});

test("repeated imports deduplicate, cross-platform plays stay separate, and exports replace overlapping API coverage", () => {
  const a = listen(), api = spotifyListen({ played_at: "2026-06-02T15:00:00Z", track: { name: "A Song", uri: "spotify:track:abc123", artists: [{ name: "An Artist" }] } }, "api")!;
  assert.equal(deduplicate([a, a, api]).length, 2);
  assert.equal(aggregationListens([a, api]).length, 1);
  const google = { ...a, id: "google-event", platform: "google-play-music" as const, source: "takeout" as const };
  const result = aggregateMusic([a, google], now);
  assert.equal(result.datasets["all/all"].stats.plays, 2); assert.equal(result.datasets["all/all"].stats.tracks, 1);
  assert.equal(result.datasets["spotify/all"].stats.plays, 1); assert.equal(result.datasets["google-play-music/all"].stats.plays, 1);
});

test("all aggregate views exclude kids genres and private sessions while preserving the original events", () => {
  for (const genre of ["children's music", "children’s folk", "kids dance", "nursery rhymes", "lullaby", "kindie rock", "música infantil", "toddler music", "disney", "cartoon"]) assert.ok(isKidsGenre(genre), genre);
  for (const genre of ["indie rock", "adult standards", "folk", "pop"]) assert.equal(isKidsGenre(genre), false, genre);
  const kids = listen({ id: "kids", track: musicTrack("Kids song", ["Kids artist"], { album: "Kids album", genres: ["children's music"] }) });
  const privatePlay = listen({ id: "private", privateSession: true });
  const rows = [listen(), kids, privatePlay];
  const before = JSON.stringify(rows), result = aggregateMusic(rows, now);
  assert.equal(JSON.stringify(rows), before);
  for (const data of Object.values(result.datasets)) {
    assert.ok(data.stats.plays <= 1);
    assert.equal(JSON.stringify(data).includes("Kids song"), false);
    assert.equal(JSON.stringify(data).includes("Kids artist"), false);
    assert.equal(JSON.stringify(data).includes("Kids album"), false);
  }
  assert.equal(result.datasets["all/all"].stats.weekdays.reduce((a, b) => a + b, 0), 1);
  assert.equal(result.datasets["all/all"].stats.months[0].plays, 1);
});

test("Michigan calendar boundaries and missing durations remain honest", () => {
  const unknown = listen({ id: "unknown", playedAt: "2026-01-01T01:00:00Z", msPlayed: null, trackDurationMs: 360000 });
  const result = aggregateMusic([unknown], now);
  assert.equal(result.datasets["all/2025"].stats.plays, 1);
  assert.equal(result.datasets["all/all"].stats.msPlayed, 0);
  assert.equal(result.datasets["all/all"].stats.durationKnown, 0);
  assert.equal(result.datasets["all/30d"].stats.plays, 0);
  assert.equal(result.datasets["all/all"].stats.hours[20], 1);
  assert.equal(result.datasets["all/all"].stats.firstListen, "2025-12-31");
});

test("favorites publish the top 100 tracks, artists, and albums for every period", () => {
  const rows = ["2025-12-02T15:00:00Z", "2026-06-02T15:00:00Z"].flatMap((playedAt, year) => [
    ...Array.from({ length: 105 }, (_, i) => {
      const name = `Entry ${String(i).padStart(3, "0")}`;
      return listen({ id: `${year}:${i}`, playedAt, msPlayed: 180000 - i, track: musicTrack(name, [name], { album: name }) });
    }),
    ...Array.from({ length: 3 }, (_, i) => listen({ id: `${year}:winner:${i}`, playedAt, track: musicTrack("Winner", ["Winner"], { album: "Winner" }) })),
    ...Array.from({ length: 5 }, (_, i) => listen({ id: `${year}:kids:${i}`, playedAt, track: musicTrack("Kids", ["Kids"], { album: "Kids", genres: ["kids music"] }) })),
  ]);
  const { datasets, manifest } = aggregateMusic(rows, now);
  assert.deepEqual(manifest.periods, ["all", "30d", "365d", "2026", "2025"]);
  for (const dataset of Object.values(datasets)) {
    for (const ranking of [dataset.stats.topTracks, dataset.stats.topArtists, dataset.stats.topAlbums]) {
      assert.equal(ranking.length, 100, `${dataset.platform}/${dataset.period}`);
      assert.equal(ranking[0].name, "Winner");
      assert.equal(ranking.at(-1)!.name, "Entry 098");
      assert.equal(ranking.some(item => item.name === "Kids"), false);
    }
  }
});

test("Disney credits and soundtrack albums are excluded without altering private records", () => {
  const disney = [
    musicTrack("You're Welcome", ["Dwayne Johnson", "Disney"]),
    musicTrack("How Far I'll Go", ["Auliʻi Cravalho"], { album: "Moana (Original Motion Picture Soundtrack)" }),
    musicTrack("Let It Go", ["Idina Menzel"], { album: "Frozen" }),
    musicTrack("Another song", ["An Artist"], { labels: ["Walt Disney Records"] }),
    musicTrack("Remember Me", ["Miguel"], { album: "Coco (Original Motion Picture Soundtrack)" }),
  ];
  for (const track of disney) assert.ok(isDisneyMusic(track));
  assert.equal(isDisneyMusic(musicTrack("Coco", ["O.T. Genasis"], { album: "Coco" })), false);
  assert.equal(isDisneyMusic(musicTrack("Cold", ["An Artist"], { album: "Frozen Dreams" })), false);
  const rows = [...Array.from({ length: 11 }, (_, i) => listen({ id: `allowed-${i}` })), ...disney.map((track, i) => listen({ id: `disney-${i}`, track }))];
  const before = JSON.stringify(rows);
  for (const data of Object.values(aggregateMusic(rows, now).datasets)) assert.equal(data.stats.plays, 11);
  const seasons = aggregateSeasons(rows, now)["all/seasons"];
  assert.deepEqual(seasons.metrics.artists.series.map(s => s.name), ["An Artist"]);
  assert.equal(JSON.stringify(rows), before);
});

test("seasons use Eastern boundaries and December belongs to the following winter", () => {
  assert.equal(musicSeason(new Date("2024-12-01T04:59:59Z")).label, "2024 Fall");
  assert.equal(musicSeason(new Date("2024-12-01T05:00:00Z")).label, "2025 Winter");
  assert.equal(musicSeason(new Date("2025-03-01T04:59:59Z")).label, "2025 Winter");
  assert.equal(musicSeason(new Date("2025-03-01T05:00:00Z")).label, "2025 Spring");
  assert.equal(musicSeason(new Date("2025-06-01T04:00:00Z")).label, "2025 Summer");
  const rows = ["2024-09-01T12:00:00Z", "2025-03-01T12:00:00Z"].flatMap((playedAt, season) => Array.from({ length: 11 }, (_, i) => listen({ id: season + ":" + i, playedAt })));
  const result = aggregateSeasons(rows, now)["all/seasons"];
  assert.deepEqual(result.seasons.map(s => s.label), ["2024 Fall", "2025 Winter", "2025 Spring"]);
  assert.deepEqual(result.metrics.artists.series[0].plays, [11, 0, 11]);
});

test("seasonal charts select the union of EACH season's top five and preserve every selected timeline", () => {
  const dates = ["2024-03", "2024-06", "2024-09", "2024-12", "2025-03", "2025-06", "2025-09", "2025-12"];
  const rows: Listen[] = [];
  const add = (season: number, name: string, times: number) => { for (let i = 0; i < times; i++) rows.push(listen({ id: `${season}-${name}-${i}`, playedAt: `${dates[season]}-15T12:00:00Z`, track: musicTrack(name, [name, name], { album: name, genres: [name, name.toUpperCase(), ` ${name} `] }) })); };
  for (let season = 0; season < dates.length; season++) {
    for (let winner = 0; winner < 5; winner++) add(season, `winner-${season}-${winner}`, 12);
    add(season, "never-a-seasonal-leader", 3);
    if (season) add(season, "winner-0-0", 1);
  }
  rows.push(listen({ id: "unknown", playedAt: "2025-03-15T12:00:00Z", track: musicTrack("Unclassified", []) }));
  rows.push(listen({ id: "future", playedAt: "2030-01-01T12:00:00Z" }));
  rows.push(listen({ id: "private", privateSession: true }));
  rows.push(listen({ id: "kids", track: musicTrack("Kids", ["Kids"], { genres: ["kids music"] }) }));
  rows.push(listen({ id: "disney", track: musicTrack("Disney song", ["Disney"]) }));
  const google = { ...rows[0], id: "google", platform: "google-play-music" as const, source: "takeout" as const };
  rows.push(google);
  const datasets = aggregateSeasons(rows, now);
  for (const metric of ["genres", "artists", "albums"] as const) {
    const data = datasets["all/seasons"].metrics[metric];
    assert.equal(data.series.length, 40, metric);
    assert.ok(!data.series.some(s => s.name === "never-a-seasonal-leader"));
    assert.deepEqual(data.series.find(s => s.name === "winner-0-0")!.plays, [13, 0, 0, 0, 0, 0, 0, 0]);
    assert.equal(data.unclassifiedPlays, 1);
    assert.equal(datasets["spotify/seasons"].metrics[metric].series.find(s => s.name === "winner-0-0")!.plays[0], 12);
    assert.equal(datasets["google-play-music/seasons"].metrics[metric].series.length, 0);
  }
  assert.equal(datasets["all/seasons"].seasons.length, 8);
  assert.equal(aggregateSeasons([], now)["all/seasons"].metrics.genres.series.length, 0);
});

test("ZIP import preserves unsupported data and original bytes, reports malformed files, and publishes only aggregates", async t => {
  const root = await mkdtemp(join(tmpdir(), "imjosh-music-test-"));
  t.after(async () => { if (!resolve(root).startsWith(resolve(tmpdir()) + "\\imjosh-music-test-") && !resolve(root).startsWith(resolve(tmpdir()) + "/imjosh-music-test-")) throw new Error("Unexpected temporary path"); await rm(root, { recursive: true, force: true }); });
  const store = localStore(join(root, "private")), publicStore = localStore(join(root, "public"));
  const bytes = zipSync({ "Streaming_History_Audio.json": strToU8(JSON.stringify([exportRow])), "library.json": strToU8(JSON.stringify({ private: "keep this entire payload" })), "bad.json": strToU8("not valid json"), "audio/upload.mp3": new Uint8Array(1024 * 1024).fill(42) });
  const filename = join(root, "export.zip"); await writeFile(filename, bytes);
  const imported = await importMusic(store, filename); assert.equal(imported.listens, 1); assert.equal(imported.rejected, 1);
  await importMusic(store, filename); assert.equal((await allListens(store)).length, 1);
  const raw = await store.list("raw/"); assert.equal(raw.length, 1); assert.deepEqual(Buffer.from((await store.get(raw[0]))!), Buffer.from(bytes));
  await writeJson(store, "catalog/genres.json", { "an artist": { genres: ["indie rock"], provider: "test", fetchedAt: now.toISOString(), artistId: null } });
  await publishMusic(store, publicStore, now);
  const manifest = (await readJson<MusicManifest>(publicStore, "manifest.json"))!;
  for (const file of Object.values(manifest.files)) {
    assert.match(file, /^datasets\/[a-f0-9]{24}\.json$/);
    const data = (await readJson<MusicDataset>(publicStore, file))!;
    const text = JSON.stringify(data); for (const secret of ["PRIVATE-IP", "PRIVATE-NAME", "rawRef", "private/source", "2026-06-02T15:03:00"]) assert.equal(text.includes(secret), false);
  }
  const seasonal = await readJson<MusicSeasonalDataset>(publicStore, manifest.files["all/seasons"]);
  assert.deepEqual(seasonal!.metrics.genres.series, []);
  // Updating only genre metadata must remove historical plays and provider rankings too.
  await writeJson(store, "catalog/genres.json", { "an artist": { genres: ["children's music"], provider: "test", fetchedAt: now.toISOString(), artistId: null } });
  await writeJson(store, "public/spotify.json", { generatedAt: now.toISOString(), ranges: { short_term: { tracks: [{ key: "song", name: "A Song", artists: ["An Artist"] }], artists: [{ key: "artist", name: "An Artist", artists: [] }] } }, playlists: [] });
  await publishMusic(store, publicStore, now);
  const filtered = (await readJson<MusicManifest>(publicStore, "manifest.json"))!;
  assert.equal((await readJson<MusicDataset>(publicStore, filtered.files["all/all"]))!.stats.plays, 0);
  const favorites = await readJson<{ ranges: { short_term: { tracks: unknown[]; artists: unknown[] } } }>(publicStore, filtered.files.spotify);
  assert.deepEqual(favorites!.ranges.short_term, { tracks: [], artists: [] });
  assert.deepEqual((await readJson<MusicEntityDataset>(publicStore, filtered.files.entities))!.entities, {});
  // Track/album genre evidence must also filter affinity tracks, even if artist genres are ordinary.
  await writeJson(store, "catalog/genres.json", { "an artist": { genres: ["indie rock"], provider: "test", fetchedAt: now.toISOString(), artistId: null } });
  await writeJson(store, "catalog/spotify-tracks.json.gz", { song: { name: "A Song", artists: [{ name: "An Artist" }], album: { genres: ["children's music"] } } });
  await publishMusic(store, publicStore, now);
  const albumFiltered = (await readJson<MusicManifest>(publicStore, "manifest.json"))!;
  assert.equal((await readJson<MusicDataset>(publicStore, albumFiltered.files["all/all"]))!.stats.plays, 0);
  const albumFavorites = await readJson<{ ranges: { short_term: { tracks: unknown[]; artists: unknown[] } } }>(publicStore, albumFiltered.files.spotify);
  assert.equal(albumFavorites!.ranges.short_term.tracks.length, 0);
  assert.equal(albumFavorites!.ranges.short_term.artists.length, 1);
  assert.equal((await allListens(store)).length, 1);
  await writeJson(store, "catalog/spotify-tracks.json.gz", {});
  await publishMusic(store, publicStore, now);
  const restored = (await readJson<MusicManifest>(publicStore, "manifest.json"))!;
  assert.equal((await readJson<MusicDataset>(publicStore, restored.files["all/all"]))!.stats.plays, 1);
  await writeJson(store, "catalog/excluded-imports.json", { [raw[0]]: { reason: "User excluded this export", excludedAt: now.toISOString() } });
  await publishMusic(store, publicStore, now);
  const excluded = (await readJson<MusicManifest>(publicStore, "manifest.json"))!;
  assert.equal((await readJson<MusicSeasonalDataset>(publicStore, excluded.files["all/seasons"]))!.seasons.length, 0);
  assert.equal((await allListens(store)).length, 1);
  const stream = await store.getStream!(raw[0]);
  await publicStore.setStream!("private-test-copy.zip", stream!, digest(bytes));
  assert.deepEqual(await publicStore.get("private-test-copy.zip"), Buffer.from(bytes));
  await assert.rejects(publicStore.setStream!("corrupt-copy.zip", (await store.getStream!(raw[0]))!, "wrong-checksum"), /checksum failed/);
  assert.equal(await publicStore.get("corrupt-copy.zip"), null);
  const googleEvent = googleListen({ header: "YouTube Music", time: "2026-06-01T12:00:00Z", title: "Watched an unverified video", titleUrl: "https://music.youtube.com/watch?v=verified-id", subtitles: [{ name: "Uploader" }] }, "google-export")!;
  await saveListens(store, [googleEvent]);
  await writeJson(store, "catalog/music-policy.json", { requireGoogleLibraryMatch: true });
  await publishMusic(store, publicStore, now);
  const unverified = (await readJson<MusicManifest>(publicStore, "manifest.json"))!;
  assert.equal((await readJson<MusicDataset>(publicStore, unverified.files["all/all"]))!.stats.plays, 0);
  const unverifiedEntities = JSON.stringify(await readJson<MusicEntityDataset>(publicStore, unverified.files.entities));
  assert.equal(unverifiedEntities.includes("unverified video"), false); assert.equal(unverifiedEntities.includes("Uploader"), false);
  await writeJson(store, "catalog/google-tracks.json.gz", { "verified-id": musicTrack("Verified Song", ["Verified Artist"], { platformId: "verified-id", album: "Verified Album", genres: ["indie"] }) });
  await publishMusic(store, publicStore, now);
  const verified = (await readJson<MusicManifest>(publicStore, "manifest.json"))!;
  const verifiedStats = (await readJson<MusicDataset>(publicStore, verified.files["all/all"]))!.stats;
  assert.equal(verifiedStats.plays, 1);
  assert.equal(verifiedStats.topArtists[0].name, "Verified Artist");
  assert.equal(verifiedStats.topAlbums[0].name, "Verified Album");
  assert.equal((await allListens(store)).length, 2);
  await assert.rejects(store.get("../../outside.json"), /Invalid music storage key/);
});
