import { strict as assert } from "node:assert";
import { test } from "node:test";
import { publicSpotifyPlayback, type SpotifyPlaybackSource } from "../src/lib/music/playback.ts";
import { currentMusicPlayback, readMusicCollection, type MusicJsonReader } from "../src/lib/music/collection.ts";
import { counterDigitPosition } from "../src/lib/music/counter.ts";
import { aggregateMusic } from "../src/lib/music/aggregate.ts";
import { publishMusic } from "../scripts/music/publish.ts";
import { readJson, saveListens, writeJson, type MusicStore } from "../scripts/music/store.ts";
import { spotifyListen } from "../src/lib/music/normalize.ts";
import type { MusicDataset, MusicEntityDataset, MusicManifest, MusicPlaybackSnapshot, MusicSeasonalDataset, SpotifySnapshot } from "../src/lib/music/types.ts";

const now = new Date("2026-11-26T20:00:00Z");
const source = (): SpotifyPlaybackSource => ({ checkedAt: now.toISOString(), data: { is_playing: true, currently_playing_type: "track", progress_ms: 30000, device: { is_private_session: false, id: "PRIVATE-DEVICE", name: "PRIVATE-NAME" }, item: { type: "track", id: "aaaaaaaaaaaaaaaaaaaaaa", name: "Song", duration_ms: 200000, artists: [{ name: "Artist" }], album: { name: "Album", images: [{ url: "https://i.scdn.co/image/cover" }] } } } });
const memory = (): MusicStore => {
  const values = new Map<string, Uint8Array>();
  return { async get(key) { return values.get(key) || null; }, async set(key, value) { values.set(key, value); }, async list(prefix) { return [...values.keys()].filter(key => key.startsWith(prefix)); } };
};

test("now playing requires explicit active music and omits private, paused, ad, podcast, and local playback", () => {
  const valid = source(), before = JSON.stringify(valid);
  const result = publicSpotifyPlayback(valid, now);
  assert.equal(result.track?.name, "Song"); assert.equal(result.status, "playing");
  for (const patch of [{ is_playing: false }, { currently_playing_type: "ad" }, { currently_playing_type: "episode" }, { device: { is_private_session: true } }, { device: {} }, { item: null }, { item: { ...valid.data!.item, is_local: true } }]) assert.equal(publicSpotifyPlayback({ ...valid, data: { ...valid.data, ...patch } }, now).track, null);
  assert.equal(publicSpotifyPlayback(null, now).track, null);
  assert.equal(publicSpotifyPlayback({ ...valid, data: {} }, now).track, null);
  assert.equal(JSON.stringify(valid), before);
  for (const secret of ["PRIVATE-DEVICE", "PRIVATE-NAME", "progress_ms", "duration_ms", "device"]) assert.equal(JSON.stringify(result).includes(secret), false);
});

test("now playing ignores expiry, elapsed observation age, and estimated track end", () => {
  const valid = source();
  assert.equal(publicSpotifyPlayback({ ...valid, checkedAt: "2026-11-25T19:58:29Z" }, now).track?.name, "Song");
  assert.equal(publicSpotifyPlayback({ ...valid, checkedAt: "2026-11-26T20:01:00Z" }, now).track, null);
  const ending = publicSpotifyPlayback({ ...valid, data: { ...valid.data, progress_ms: 200000 } }, now);
  assert.equal(ending.expiresAt, undefined);
  assert.equal(currentMusicPlayback(ending)?.name, "Song");
  assert.equal(currentMusicPlayback({ ...ending, checkedAt: "2020-01-01T00:00:00Z", expiresAt: "2020-01-01T00:00:01Z" })?.name, "Song");
});

test("now playing retains the song through unknown updates and clears on a confirmed stop", () => {
  const active = publicSpotifyPlayback(source(), now), previous = currentMusicPlayback(active);
  assert.ok(previous);
  for (const snapshot of [null, { ...active, track: null, status: undefined }, publicSpotifyPlayback(null, now), publicSpotifyPlayback({ checkedAt: now.toISOString(), data: null }, now), publicSpotifyPlayback({ checkedAt: now.toISOString(), data: { is_playing: true } }, now)]) assert.equal(currentMusicPlayback(snapshot, previous), previous);
  for (const data of [{}, { is_playing: false }, { ...source().data, device: { is_private_session: true } }]) {
    const stopped = publicSpotifyPlayback({ checkedAt: now.toISOString(), data }, now);
    assert.equal(stopped.status, "stopped"); assert.equal(currentMusicPlayback(stopped, previous), null);
  }
  const next = { ...active, track: { ...previous, key: "next", name: "Next song" } };
  assert.equal(currentMusicPlayback(next, previous)?.name, "Next song");
});

test("publication shows kids and Disney playback while keeping history, charts, and rankings filtered", async () => {
  for (const patch of [{ genres: ["kids music"] }, { album: { name: "Frozen" } }]) {
    const privateStore = memory(), publicStore = memory(), active = source();
    active.data!.item = { ...active.data!.item, ...patch };
    const listen = spotifyListen({ played_at: now.toISOString(), track: active.data!.item }, "PRIVATE-RAW")!;
    await saveListens(privateStore, [listen]);
    await writeJson(privateStore, "state/spotify-playback.json", active);
    await writeJson(privateStore, "catalog/spotify-tracks.json.gz", { track: active.data!.item });
    await writeJson(privateStore, "catalog/genres.json", { artist: { genres: patch.genres || [], provider: "spotify", fetchedAt: now.toISOString(), artistId: null } });
    const ranked = { key: listen.track.key, name: listen.track.title, artists: listen.track.artists, image: null, url: null, plays: 1, msPlayed: 0 };
    await writeJson(privateStore, "public/spotify.json", { generatedAt: now.toISOString(), ranges: { short_term: { tracks: [ranked], artists: [] } }, playlists: [] });
    const { manifest } = await publishMusic(privateStore, publicStore, now);
    const playback = await readJson<MusicPlaybackSnapshot>(publicStore, manifest.files.playback);
    assert.equal(playback?.track?.name, "Song");
    assert.equal(playback?.track?.album, listen.track.album);
    assert.equal(currentMusicPlayback(playback)?.key, listen.track.key);
    const history = await readJson<MusicDataset>(publicStore, manifest.files["all/all"]);
    assert.equal(history?.stats.plays, 0);
    assert.deepEqual(history?.stats.topTracks, []); assert.deepEqual(history?.stats.topArtists, []); assert.deepEqual(history?.stats.topAlbums, []);
    assert.deepEqual(history?.stats.months, []); assert.equal(history?.stats.weekdays.reduce((sum, count) => sum + count, 0), 0);
    const seasons = await readJson<MusicSeasonalDataset>(publicStore, manifest.files["all/seasons"]);
    for (const metric of Object.values(seasons!.metrics)) assert.deepEqual(metric.series, []);
    const favorites = await readJson<SpotifySnapshot>(publicStore, manifest.files.spotify);
    assert.deepEqual(favorites?.ranges.short_term.tracks, []);
    const entities = await readJson<MusicEntityDataset>(publicStore, manifest.files.entities);
    for (const entity of Object.values(entities!.entities)) assert.equal(entity.plays, 0);
    assert.deepEqual(await readJson(privateStore, "state/spotify-playback.json"), active);
  }
});

test("unchanged summaries retain immutable filenames while the manifest and playback observation refresh", async () => {
  const privateStore = memory(), publicStore = memory();
  await writeJson(privateStore, "state/spotify-playback.json", source());
  const first = await publishMusic(privateStore, publicStore, now);
  const later = new Date(now.getTime() + 60000);
  await writeJson(privateStore, "state/spotify-playback.json", { ...source(), checkedAt: later.toISOString() });
  const second = await publishMusic(privateStore, publicStore, later);
  assert.notEqual(first.manifest.generatedAt, second.manifest.generatedAt);
  for (const [key, file] of Object.entries(first.manifest.files)) if (key !== "playback") assert.equal(second.manifest.files[key], file, key);
  assert.notEqual(first.manifest.files.playback, second.manifest.files.playback);
  assert.equal((await privateStore.list("listens/")).length, 0);
  const data = await readJson<{ stats: { plays: number } }>(publicStore, second.manifest.files["all/all"]);
  assert.equal(data!.stats.plays, 0);
});

test("publication keeps the last playback across unavailable updates until Spotify confirms a stop", async () => {
  const privateStore = memory(), publicStore = memory();
  await writeJson(privateStore, "state/spotify-playback.json", source());
  const first = await publishMusic(privateStore, publicStore, now);
  await writeJson(privateStore, "state/spotify-playback.json", { checkedAt: now.toISOString(), data: null });
  const unknown = await publishMusic(privateStore, publicStore, new Date(now.getTime() + 3600000));
  assert.equal(unknown.manifest.files.playback, first.manifest.files.playback);
  const retained = await readJson<MusicPlaybackSnapshot>(publicStore, unknown.manifest.files.playback);
  assert.equal(currentMusicPlayback(retained)?.name, "Song");
  await writeJson(privateStore, "state/spotify-playback.json", { checkedAt: now.toISOString(), data: {} });
  const stopped = await publishMusic(privateStore, publicStore, new Date(now.getTime() + 7200000));
  const playback = await readJson<MusicPlaybackSnapshot>(publicStore, stopped.manifest.files.playback);
  assert.equal(playback?.status, "stopped"); assert.equal(currentMusicPlayback(playback, retained!.track), null);
  await writeJson(privateStore, "state/spotify-playback.json", null);
  const unavailable = await publishMusic(privateStore, publicStore, new Date(now.getTime() + 10800000));
  assert.equal(unavailable.manifest.files.playback, stopped.manifest.files.playback);
});

test("a refresh loads a complete collection, caches unchanged files, and rejects incomplete revisions", async () => {
  const all = aggregateMusic([], now), cache = new Map<string, unknown>();
  const names = ["1", "2", "3", "4", "5"].map(value => `datasets/${value.repeat(24)}.json`);
  const manifest: MusicManifest = { ...all.manifest, files: { "all/30d": names[0], "all/all": names[4], spotify: names[1], "all/seasons": names[2], playback: names[3] } };
  const payloads = new Map<string, unknown>([["manifest.json", manifest], [names[0], all.datasets["all/30d"]], [names[1], { generatedAt: now.toISOString(), ranges: {}, playlists: [] }], [names[2], { version: 1, seasons: [], metrics: {} }], [names[3], publicSpotifyPlayback(source(), now)], [names[4], all.datasets["all/all"]]]);
  const calls: string[] = [];
  const reader: MusicJsonReader = async <T,>(file: string) => { calls.push(file); if (!payloads.has(file)) throw new Error("Missing dataset"); return payloads.get(file) as T; };
  const signal = new AbortController().signal;
  const initial = await readMusicCollection(reader, "30d", signal, cache);
  assert.equal(initial.playback?.track?.name, "Song"); assert.equal(calls.length, 5);
  calls.length = 0;
  const again = await readMusicCollection(reader, "30d", signal, cache);
  assert.equal(again.data, initial.data); assert.deepEqual(calls, ["manifest.json"]);
  const allTime = await readMusicCollection(reader, "all", signal, cache);
  assert.equal(allTime.data?.period, "all");
  payloads.set("manifest.json", { ...manifest, files: { ...manifest.files, playback: "datasets/ffffffffffffffffffffffff.json" } });
  await assert.rejects(readMusicCollection(reader, "30d", signal, cache), /Missing dataset/);
  assert.equal(initial.data?.period, "30d");
  const cancelled = new AbortController(); cancelled.abort();
  await assert.rejects(readMusicCollection(reader, "30d", cancelled.signal, cache, manifest));
});

test("counter reels carry across decimal places smoothly in both directions", () => {
  assert.equal(counterDigitPosition(99.5, 0), 9.5);
  assert.equal(counterDigitPosition(99.5, 1), 9.5);
  assert.equal(counterDigitPosition(99.5, 2), .5);
  assert.equal(counterDigitPosition(100, 0), 0);
  assert.equal(counterDigitPosition(100, 1), 0);
  assert.equal(counterDigitPosition(100, 2), 1);
  assert.equal(counterDigitPosition(1234.5, 2), 2);
  assert.deepEqual([100, 99.75, 99.5, 99].map(value => counterDigitPosition(value, 2)), [1, .75, .5, 0]);
});
