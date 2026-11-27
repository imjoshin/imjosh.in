import { strict as assert } from "node:assert";
import { test } from "node:test";
import { runMusicHistoryJob, HISTORY_FINGERPRINT_FILE } from "../scripts/music/history-job.ts";
import { nextHistoryRefreshAt, spotifyHistoryFingerprint } from "../scripts/music/history-fingerprint.ts";
import { publishMusic } from "../scripts/music/publish.ts";
import { collectSpotify } from "../scripts/music/spotify.ts";
import { HISTORY_INPUT_REVISION_FILE, allListens, readJson, saveListens, writeJson, type MusicStore } from "../scripts/music/store.ts";
import { spotifyListen } from "../src/lib/music/normalize.ts";
import type { MusicDataset, MusicManifest } from "../src/lib/music/types.ts";

const start = new Date("2026-11-27T16:00:00Z");
const minutes = (value: number) => new Date(start.getTime() + value * 60000);
const track = { id: "a".repeat(22), uri: "spotify:track:" + "a".repeat(22), type: "track", name: "Song", artists: [{ name: "Artist", id: "b".repeat(22), genres: ["indie"] }], album: { name: "Album", artists: [{ name: "Artist" }] } };
const play = (playedAt = start.toISOString()) => ({ played_at: playedAt, track: structuredClone(track) });
function memory() {
  const values = new Map<string, Uint8Array>(), reads: string[] = [], writes: string[] = [];
  const store: MusicStore = {
    async get(key) { reads.push(key); return values.get(key) || null; },
    async set(key, value) { writes.push(key); values.set(key, value); },
    async list(prefix) { return [...values.keys()].filter(key => key.startsWith(prefix)); },
  };
  return { store, values, reads, writes };
}
async function cachedPage(store: MusicStore, items: ReturnType<typeof play>[], checkedAt: Date) {
  const rawRef = `raw/${checkedAt.getTime()}/recent.json`;
  await store.set(rawRef, Buffer.from(JSON.stringify({ items })));
  await writeJson(store, "state/spotify-last-tracks.json", { checkedAt: checkedAt.toISOString(), rawRef, data: { items } });
}
async function fixture(items = [play()]) {
  const privateData = memory(), publicData = memory(), calls: string[] = [];
  let clock = start;
  const fetcher: typeof fetch = async url => {
    const path = new URL(String(url)).pathname;
    calls.push(path);
    if (path === "/api/token") return Response.json({ access_token: "PRIVATE-ACCESS", expires_in: 3600 });
    assert.equal(path, "/v1/me/player/recently-played");
    return Response.json({ items });
  };
  await writeJson(privateData.store, "secrets/spotify.json", { clientId: "client", refreshToken: "PRIVATE-REFRESH", scope: "read", authorizedAt: start.toISOString(), refreshTokenExpiresAt: null });
  await writeJson(privateData.store, "state/spotify-full.json", { fetchedAt: start.toISOString() });
  await cachedPage(privateData.store, items, clock);
  const options = { now: () => clock, fetch: fetcher };
  const run = (extra: Parameters<typeof runMusicHistoryJob>[2] = {}) => runMusicHistoryJob(privateData.store, publicData.store, { ...options, ...extra });
  return { privateData, publicData, calls, run, setTime(value: Date) { clock = value; }, options };
}

test("history fingerprints follow distinct plays and ignore order, duplicates, and volatile metadata", () => {
  const first = play(), second = play(minutes(1).toISOString());
  const decorated = structuredClone(first);
  Object.assign(decorated.track, { popularity: 99, album: { ...decorated.track.album, images: [{ url: "https://i.scdn.co/image/new" }] } });
  assert.equal(spotifyHistoryFingerprint({ items: [first] }), spotifyHistoryFingerprint({ items: [decorated, first] }));
  assert.equal(spotifyHistoryFingerprint({ items: [first, second] }), spotifyHistoryFingerprint({ items: [second, first] }));
  assert.notEqual(spotifyHistoryFingerprint({ items: [first] }), spotifyHistoryFingerprint({ items: [second] }));
  assert.notEqual(spotifyHistoryFingerprint({ items: [] }), spotifyHistoryFingerprint({ items: [first] }));
  for (const data of [null, {}, { items: null }, { items: [null] }, { items: [{ ...first, played_at: "invalid" }] }, { items: [{ ...first, track: { name: "Song", artists: [null] } }] }]) assert.equal(spotifyHistoryFingerprint(data), null);
});

test("unchanged history reuses the minute snapshot without API calls, archive reads, collection, or public writes", async () => {
  const f = await fixture();
  assert.equal((await f.run()).skipped, false);
  const fingerprint = await f.privateData.store.get(HISTORY_FINGERPRINT_FILE);
  f.setTime(minutes(10));
  await cachedPage(f.privateData.store, [play()], minutes(9.5));
  f.calls.length = 0; f.privateData.reads.length = 0; f.privateData.writes.length = 0; f.publicData.writes.length = 0;
  const result = await runMusicHistoryJob({ ...f.privateData.store, async list() { throw new Error("Must not scan history"); } }, f.publicData.store, {
    ...f.options, async fetch() { throw new Error("Must not call Spotify"); },
    async collect() { throw new Error("Must not collect"); }, async publish() { throw new Error("Must not publish"); },
  });
  assert.equal(result.skipped, true);
  assert.equal(result.listens, 1);
  assert.equal(result.completedAt, minutes(10).toISOString());
  assert.deepEqual(f.privateData.writes, ["state/job.json"]);
  assert.deepEqual(f.publicData.writes, []);
  assert.ok(f.privateData.reads.every(key => key.startsWith("state/")));
  assert.deepEqual(await f.privateData.store.get(HISTORY_FINGERPRINT_FILE), fingerprint);
});

test("a repeated song with a new play timestamp updates history even when playback is stopped", async () => {
  const f = await fixture(); await f.run(); f.setTime(minutes(10));
  const second = play(minutes(9).toISOString());
  await cachedPage(f.privateData.store, [second, play()], minutes(9.5));
  await writeJson(f.privateData.store, "state/spotify-playback.json", { checkedAt: minutes(9.5).toISOString(), data: {} });
  assert.equal((await f.run()).skipped, false);
  assert.equal((await allListens(f.privateData.store)).length, 2);
  const manifest = (await readJson<MusicManifest>(f.publicData.store, "manifest.json"))!;
  assert.equal((await readJson<MusicDataset>(f.publicData.store, manifest.files["all/all"]))?.stats.plays, 2);
  assert.equal(await f.publicData.store.get(HISTORY_FINGERPRINT_FILE), null);
});

test("a stale, missing, future, or unarchived snapshot falls back to one recent-history request", async () => {
  for (const cache of ["missing", "stale", "future", "unarchived", "invalid"] as const) {
    const f = await fixture();
    if (cache === "missing") f.privateData.values.delete("state/spotify-last-tracks.json");
    if (cache === "stale") await cachedPage(f.privateData.store, [play()], minutes(-2));
    if (cache === "future") await cachedPage(f.privateData.store, [play()], minutes(1));
    if (cache === "unarchived") await writeJson(f.privateData.store, "state/spotify-last-tracks.json", { checkedAt: start.toISOString(), data: { items: [play()] } });
    if (cache === "invalid") await writeJson(f.privateData.store, "state/spotify-last-tracks.json", { checkedAt: start.toISOString(), rawRef: "raw/cache", data: {} });
    assert.equal((await f.run()).skipped, false);
    assert.equal(f.calls.filter(path => path === "/v1/me/player/recently-played").length, 1, cache);
    const listens = await allListens(f.privateData.store);
    assert.equal(listens.length, 1);
    assert.ok(await f.privateData.store.get(listens[0].rawRef));
  }
});

test("the shared snapshot cannot move history backwards relative to the successful checkpoint", async () => {
  const f = await fixture(); await f.run(); f.setTime(minutes(0.5));
  await cachedPage(f.privateData.store, [], minutes(-0.5));
  f.calls.length = 0;
  assert.equal((await f.run()).skipped, true);
  assert.equal(f.calls.filter(path => path === "/v1/me/player/recently-played").length, 1);
});

test("a successful empty history can no-op, but an unavailable or malformed response cannot", async () => {
  const empty = await fixture([]); await empty.run(); empty.setTime(minutes(10));
  await cachedPage(empty.privateData.store, [], minutes(9.5));
  assert.equal((await empty.run()).skipped, true);
  for (const response of [() => new Response(null, { status: 403 }), () => Response.json({}), () => Response.json({ items: [null] })]) {
    const f = await fixture(); await f.run(); f.setTime(minutes(10));
    const prior = await f.privateData.store.get(HISTORY_FINGERPRINT_FILE);
    await assert.rejects(f.run({ fetch: async () => response() }), /recent history is unavailable or invalid/);
    assert.deepEqual(await f.privateData.store.get(HISTORY_FINGERPRINT_FILE), prior);
  }
});

test("a reused first page still walks backward when more than 50 plays need collection", async () => {
  const f = await fixture(); await f.run(); f.setTime(minutes(10));
  const firstPage = Array.from({ length: 50 }, (_, index) => play(new Date(minutes(9).getTime() - index * 1000).toISOString()));
  await cachedPage(f.privateData.store, firstPage, minutes(9.5));
  const calls: string[] = [];
  await f.run({ fetch: async url => {
    const parsed = new URL(String(url)); calls.push(parsed.href);
    if (parsed.pathname.startsWith("/v1/artists/")) return Response.json({ ...track.artists[0], images: [] });
    assert.equal(parsed.pathname, "/v1/me/player/recently-played");
    assert.equal(parsed.searchParams.get("before"), String(Date.parse(firstPage.at(-1)!.played_at)));
    return Response.json({ items: [play()] });
  } });
  assert.equal(calls.filter(url => new URL(url).pathname === "/v1/me/player/recently-played").length, 1);
  assert.equal((await allListens(f.privateData.store)).length, 51);
});

test("collection reusing a checked page cannot overwrite a newer minute-worker observation", async () => {
  const f = await fixture(); await f.run();
  const oldPage = (await readJson<any>(f.privateData.store, "state/spotify-last-tracks.json"))!;
  await cachedPage(f.privateData.store, [play(minutes(1).toISOString()), play()], minutes(1.5));
  const newer = await f.privateData.store.get("state/spotify-last-tracks.json");
  await collectSpotify(f.privateData.store, false, 0, false, { playback: false, recentPage: oldPage, async fetch() { throw new Error("Unexpected request"); } });
  assert.deepEqual(await f.privateData.store.get("state/spotify-last-tracks.json"), newer);
});

test("a publication failure never advances the fingerprint or loses newly collected plays", async () => {
  const f = await fixture(); await f.run(); f.setTime(minutes(10));
  const prior = await f.privateData.store.get(HISTORY_FINGERPRINT_FILE);
  await cachedPage(f.privateData.store, [play(minutes(9).toISOString()), play()], minutes(9.5));
  await assert.rejects(f.run({ async publish() { throw new Error("Publication failed"); } }), /Publication failed/);
  assert.deepEqual(await f.privateData.store.get(HISTORY_FINGERPRINT_FILE), prior);
  assert.equal((await allListens(f.privateData.store)).length, 2);
  assert.equal((await f.run()).skipped, false);
  assert.notDeepEqual(await f.privateData.store.get(HISTORY_FINGERPRINT_FILE), prior);
});

test("a collection failure is retried without acknowledging the new history", async () => {
  const f = await fixture(); await f.run(); f.setTime(minutes(10));
  const prior = await f.privateData.store.get(HISTORY_FINGERPRINT_FILE);
  await cachedPage(f.privateData.store, [play(minutes(9).toISOString()), play()], minutes(9.5));
  await assert.rejects(f.run({ async collect() { throw new Error("Collection failed"); } }), /Collection failed/);
  assert.deepEqual(await f.privateData.store.get(HISTORY_FINGERPRINT_FILE), prior);
  assert.equal((await f.run()).skipped, false);
});

test("daily full sync still runs with an unchanged play fingerprint", async () => {
  const f = await fixture(); await f.run(); f.setTime(minutes(10));
  await cachedPage(f.privateData.store, [play()], minutes(9.5));
  await writeJson(f.privateData.store, "state/spotify-full.json", { fetchedAt: "2026-11-26T16:00:00Z" });
  let fullSync = false;
  const result = await f.run({ async collect(store, full) {
    fullSync = full === true;
    await writeJson(store, "state/spotify-full.json", { fetchedAt: minutes(10).toISOString() });
    return { requests: 0, tracks: 0, artists: 0, unavailable: 0, artistImages: { artists: 0, requested: 0 } };
  } });
  assert.equal(fullSync, true); assert.equal(result.skipped, false);
});

test("catalog, policy, canonical history, manifest, code revision, and failed-job changes invalidate a no-op", async () => {
  for (const kind of ["catalog", "policy", "listens", "manifest", "revision", "failed-job"] as const) {
    const f = await fixture(); await f.run(); f.setTime(minutes(10));
    await cachedPage(f.privateData.store, [play()], minutes(9.5));
    if (kind === "catalog") await writeJson(f.privateData.store, "catalog/genres.json", {});
    if (kind === "policy") await writeJson(f.privateData.store, "catalog/music-policy.json", { requireGoogleLibraryMatch: true });
    if (kind === "listens") await saveListens(f.privateData.store, [spotifyListen(play(minutes(-1).toISOString()), "raw/import")!]);
    if (kind === "manifest") {
      const manifest = (await readJson<MusicManifest>(f.publicData.store, "manifest.json"))!;
      await writeJson(f.publicData.store, "manifest.json", { ...manifest, generatedAt: minutes(1).toISOString() });
    }
    if (kind === "revision") {
      const prior = await readJson<Record<string, unknown>>(f.privateData.store, HISTORY_FINGERPRINT_FILE);
      await writeJson(f.privateData.store, HISTORY_FINGERPRINT_FILE, { ...prior, publicationRevision: "old-deployment" });
    }
    if (kind === "failed-job") await writeJson(f.privateData.store, "state/job.json", { ok: false });
    assert.equal((await f.run()).skipped, false, kind);
  }
});

test("input changes during publication invalidate the following check", async () => {
  const f = await fixture();
  await f.run({ async publish(privateStore, publicStore, now) {
    const result = await publishMusic(privateStore, publicStore, now);
    await writeJson(privateStore, "catalog/music-policy.json", { requireGoogleLibraryMatch: true });
    return result;
  } });
  f.setTime(minutes(10)); await cachedPage(f.privateData.store, [play()], minutes(9.5));
  assert.equal((await f.run()).skipped, false);
});

test("an input write begun before publication and completed after it invalidates the checkpoint", async () => {
  const f = await fixture(); await f.run();
  let finish!: () => void, began!: () => void;
  const pending = new Promise<void>(resolve => { finish = resolve; });
  const started = new Promise<void>(resolve => { began = resolve; });
  const write = writeJson({ ...f.privateData.store, async set(key, bytes) {
    if (key === "catalog/music-policy.json") { began(); await pending; }
    await f.privateData.store.set(key, bytes);
  } }, "catalog/music-policy.json", { requireGoogleLibraryMatch: true });
  await started;
  f.setTime(minutes(10)); await cachedPage(f.privateData.store, [play()], minutes(9.5));
  assert.equal((await f.run()).skipped, false);
  const checkpoint = (await readJson<{ inputs: string }>(f.privateData.store, HISTORY_FINGERPRINT_FILE))!;
  finish(); await write;
  assert.notEqual((await readJson<{ revision: string }>(f.privateData.store, HISTORY_INPUT_REVISION_FILE))?.revision, checkpoint.inputs);
  f.setTime(minutes(20)); await cachedPage(f.privateData.store, [play()], minutes(19.5));
  assert.equal((await f.run()).skipped, false);
});

test("rolling-window expirations rebuild charts without a new Spotify play", async () => {
  const f = await fixture();
  const expiring = new Date(minutes(5).getTime() - 30 * 86400000);
  await saveListens(f.privateData.store, [spotifyListen(play(expiring.toISOString()), "raw/import")!]);
  await f.run();
  const checkpoint = (await readJson<{ nextRefreshAt: string }>(f.privateData.store, HISTORY_FINGERPRINT_FILE))!;
  assert.equal(checkpoint.nextRefreshAt, new Date(minutes(5).getTime() + 1).toISOString());
  f.setTime(minutes(10)); await cachedPage(f.privateData.store, [play()], minutes(9.5));
  assert.equal((await f.run()).skipped, false);
  const manifest = (await readJson<MusicManifest>(f.publicData.store, "manifest.json"))!;
  assert.equal((await readJson<MusicDataset>(f.publicData.store, manifest.files["all/30d"]))?.stats.plays, 1);
});

test("time invalidation honors inclusive cutoffs, future rows, calendar-month recommendations, and Eastern DST midnights", () => {
  const row = (playedAt: string) => spotifyListen(play(playedAt), "raw/test")!;
  assert.equal(nextHistoryRefreshAt([], start), "2026-11-28T05:00:00.000Z");
  assert.equal(nextHistoryRefreshAt([], new Date("2026-11-01T04:30:00Z")), "2026-11-02T05:00:00.000Z");
  assert.equal(nextHistoryRefreshAt([], new Date("2026-03-08T05:30:00Z")), "2026-03-09T04:00:00.000Z");
  assert.equal(nextHistoryRefreshAt([row(minutes(3).toISOString())], start), minutes(3).toISOString());
  assert.equal(nextHistoryRefreshAt([row(new Date(start.getTime() - 365 * 86400000).toISOString())], start), new Date(start.getTime() + 1).toISOString());
  // May and November use different Eastern UTC offsets. Six months is not 180 days.
  assert.equal(nextHistoryRefreshAt([row("2026-05-27T15:04:00Z")], start), "2026-11-27T16:04:00.001Z");
  const folding = [row("2026-05-01T05:45:00Z")];
  assert.equal(nextHistoryRefreshAt(folding, new Date("2026-11-01T04:30:00Z")), "2026-11-01T05:45:00.001Z");
  assert.equal(nextHistoryRefreshAt(folding, new Date("2026-11-01T05:50:00Z")), "2026-11-01T06:00:00.000Z");
  assert.equal(nextHistoryRefreshAt([row("2025-09-08T06:30:00Z")], new Date("2026-03-08T05:30:00Z")), "2026-03-08T07:00:00.000Z");
});

test("failed input writes still invalidate the successful history checkpoint", async () => {
  const f = await fixture(); await f.run();
  const before = await f.privateData.store.get(HISTORY_INPUT_REVISION_FILE);
  await assert.rejects(writeJson({ ...f.privateData.store, async set(key, bytes) {
    if (key === "catalog/music-policy.json") throw new Error("Storage failed");
    await f.privateData.store.set(key, bytes);
  } }, "catalog/music-policy.json", {}), /Storage failed/);
  assert.notDeepEqual(await f.privateData.store.get(HISTORY_INPUT_REVISION_FILE), before);
});
