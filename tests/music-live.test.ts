import { strict as assert } from "node:assert";
import { test } from "node:test";
import { publicSpotifyPlayback, type SpotifyPlaybackSource } from "../src/lib/music/playback.ts";
import { currentMusicPlayback, readMusicCollection, type MusicJsonReader } from "../src/lib/music/collection.ts";
import { counterDigitPosition } from "../src/lib/music/counter.ts";
import { aggregateMusic } from "../src/lib/music/aggregate.ts";
import { publishMusic } from "../scripts/music/publish.ts";
import { readJson, writeJson, type MusicStore } from "../scripts/music/store.ts";
import type { MusicManifest } from "../src/lib/music/types.ts";

const now = new Date("2026-11-26T20:00:00Z");
const source = (): SpotifyPlaybackSource => ({ checkedAt: now.toISOString(), data: { is_playing: true, currently_playing_type: "track", progress_ms: 30000, device: { is_private_session: false, id: "PRIVATE-DEVICE", name: "PRIVATE-NAME" }, item: { type: "track", id: "aaaaaaaaaaaaaaaaaaaaaa", name: "Song", duration_ms: 200000, artists: [{ name: "Artist" }], album: { name: "Album", images: [{ url: "https://i.scdn.co/image/cover" }] } } } });
const memory = (): MusicStore => {
  const values = new Map<string, Uint8Array>();
  return { async get(key) { return values.get(key) || null; }, async set(key, value) { values.set(key, value); }, async list(prefix) { return [...values.keys()].filter(key => key.startsWith(prefix)); } };
};

test("now playing requires explicit active music and omits private, paused, ad, podcast, and local playback", () => {
  const valid = source(), before = JSON.stringify(valid);
  const result = publicSpotifyPlayback(valid, undefined, undefined, undefined, now);
  assert.equal(result.track?.name, "Song"); assert.equal(Date.parse(result.expiresAt) - now.getTime(), 90000);
  for (const patch of [{ is_playing: false }, { currently_playing_type: "ad" }, { currently_playing_type: "episode" }, { device: { is_private_session: true } }, { device: {} }, { item: null }, { item: { ...valid.data!.item, is_local: true } }]) assert.equal(publicSpotifyPlayback({ ...valid, data: { ...valid.data, ...patch } }, undefined, undefined, undefined, now).track, null);
  assert.equal(publicSpotifyPlayback(null, undefined, undefined, undefined, now).track, null);
  assert.equal(publicSpotifyPlayback({ ...valid, data: {} }, undefined, undefined, undefined, now).track, null);
  assert.equal(JSON.stringify(valid), before);
  for (const secret of ["PRIVATE-DEVICE", "PRIVATE-NAME", "progress_ms", "duration_ms", "device"]) assert.equal(JSON.stringify(result).includes(secret), false);
});

test("now playing applies existing music exclusions and expires on track end or stale observations", () => {
  const valid = source();
  assert.equal(publicSpotifyPlayback(valid, () => ["kids music"], undefined, undefined, now).track, null);
  assert.equal(publicSpotifyPlayback(valid, undefined, () => ["nursery rhymes"], undefined, now).track, null);
  assert.equal(publicSpotifyPlayback(valid, undefined, undefined, () => true, now).track, null);
  assert.equal(publicSpotifyPlayback({ ...valid, data: { ...valid.data, item: { ...valid.data!.item, album: { name: "Frozen" } } } }, undefined, undefined, undefined, now).track, null);
  assert.equal(publicSpotifyPlayback({ ...valid, checkedAt: "2026-11-26T19:58:29Z" }, undefined, undefined, undefined, now).track, null);
  assert.equal(publicSpotifyPlayback({ ...valid, checkedAt: "2026-11-26T20:01:00Z" }, undefined, undefined, undefined, now).track, null);
  const ending = publicSpotifyPlayback({ ...valid, data: { ...valid.data, progress_ms: 198000 } }, undefined, undefined, undefined, now);
  assert.equal(Date.parse(ending.expiresAt) - now.getTime(), 2000);
  assert.equal(currentMusicPlayback(ending, now.getTime())?.name, "Song");
  assert.equal(currentMusicPlayback(ending, now.getTime() + 2000), null);
  assert.equal(currentMusicPlayback({ ...ending, expiresAt: "2030-01-01T00:00:00Z" }, now.getTime() + 90001), null);
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

test("a refresh loads a complete collection, caches unchanged files, and rejects incomplete revisions", async () => {
  const all = aggregateMusic([], now), cache = new Map<string, unknown>();
  const names = ["1", "2", "3", "4", "5"].map(value => `datasets/${value.repeat(24)}.json`);
  const manifest: MusicManifest = { ...all.manifest, files: { "all/30d": names[0], "all/all": names[4], spotify: names[1], "all/seasons": names[2], playback: names[3] } };
  const payloads = new Map<string, unknown>([["manifest.json", manifest], [names[0], all.datasets["all/30d"]], [names[1], { generatedAt: now.toISOString(), ranges: {}, playlists: [] }], [names[2], { version: 1, seasons: [], metrics: {} }], [names[3], publicSpotifyPlayback(source(), undefined, undefined, undefined, now)], [names[4], all.datasets["all/all"]]]);
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
