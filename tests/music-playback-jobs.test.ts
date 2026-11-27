import { strict as assert } from "node:assert";
import { test } from "node:test";
import { collectSpotifyPlayback, publishMusicPlayback, savedMusicPlayback } from "../scripts/music/playback.ts";
import { collectSpotify } from "../scripts/music/spotify.ts";
import { spotifyAccessToken } from "../scripts/music/spotify-token.ts";
import { publishMusic } from "../scripts/music/publish.ts";
import { readJson, writeJson, type MusicStore } from "../scripts/music/store.ts";
import { currentMusicPlayback, readMusicCollection, readMusicPlayback, type MusicJsonReader } from "../src/lib/music/collection.ts";
import type { MusicPlaybackSnapshot } from "../src/lib/music/types.ts";
import { config as historySchedule } from "../netlify/functions/music-schedule.mts";
import { config as playbackSchedule } from "../netlify/functions/music-playback-schedule.mts";

const now = new Date("2026-11-27T16:00:00Z");
const memory = (): MusicStore => {
  const values = new Map<string, Uint8Array>();
  return { async get(key) { return values.get(key) || null; }, async set(key, value) { values.set(key, value); }, async list(prefix) { return [...values.keys()].filter(key => key.startsWith(prefix)); } };
};
const source = (name = "Song") => ({ checkedAt: now.toISOString(), data: { is_playing: true, currently_playing_type: "track", progress_ms: 10000, device: { is_private_session: false, id: "PRIVATE-DEVICE" }, item: { type: "track", name, artists: [{ name: "Artist" }], album: { name: "Album" } } } });
const credentials = { clientId: "client", refreshToken: "PRIVATE-REFRESH", scope: "read", authorizedAt: now.toISOString(), refreshTokenExpiresAt: null };

test("history runs every ten minutes and independent playback runs every minute", () => {
  assert.equal(historySchedule.schedule, "*/10 * * * *");
  assert.equal(playbackSchedule.schedule, "* * * * *");
});

test("playback publishes without reading history or changing the manifest, including stop and unknown handling", async () => {
  const privateStore = memory(), publicStore = memory();
  await writeJson(publicStore, "manifest.json", { sentinel: "history" });
  await writeJson(privateStore, "state/spotify-playback.json", source());
  await writeJson(privateStore, "catalog/artist_images.json", { artist: { name: "Artist", spotifyArtistId: "PRIVATE-ID", updatedAt: now.toISOString(), images: [{ url: "https://i.scdn.co/image/artist" }] }, other: { name: "Other", images: [{ url: "https://i.scdn.co/image/other" }] } });
  const isolated: MusicStore = { ...privateStore, async list() { throw new Error("Playback must not list history"); }, async get(key) { assert.ok(["state/spotify-playback.json", "state/spotify-last-tracks.json", "catalog/artist_images.json"].includes(key)); return privateStore.get(key); } };
  const playing = await publishMusicPlayback(isolated, publicStore, now);
  assert.equal(playing.track?.name, "Song");
  assert.deepEqual(playing.artistImages, [{ name: "Artist", image: "https://i.scdn.co/image/artist" }]);
  for (const secret of ["PRIVATE-DEVICE", "PRIVATE-ID", "progress_ms", "Other", "other"]) assert.equal(JSON.stringify(playing).includes(secret), false);
  await writeJson(privateStore, "state/spotify-playback.json", { checkedAt: now.toISOString(), data: null });
  assert.deepEqual(await publishMusicPlayback(isolated, publicStore, now), playing);
  for (const data of [{}, { is_playing: false }, { ...source().data, device: { is_private_session: true } }]) {
    await writeJson(privateStore, "state/spotify-playback.json", { checkedAt: now.toISOString(), data });
    const stopped = await publishMusicPlayback(isolated, publicStore, now);
    assert.equal(stopped.status, "stopped"); assert.equal(stopped.track, null); assert.deepEqual(stopped.artistImages, []);
  }
  await writeJson(privateStore, "state/spotify-playback.json", { checkedAt: now.toISOString(), data: null });
  assert.equal((await publishMusicPlayback(isolated, publicStore, now)).status, "stopped");
  assert.deepEqual(await readJson(publicStore, "manifest.json"), { sentinel: "history" });
  assert.deepEqual(await publicStore.list(""), ["manifest.json", "playback.json"]);
});

test("first standalone publication retains legacy playback when Spotify is unavailable", async () => {
  const privateStore = memory(), publicStore = memory();
  await writeJson(privateStore, "state/spotify-playback.json", source());
  const { manifest } = await publishMusic(privateStore, publicStore, now);
  const legacy = await readJson<MusicPlaybackSnapshot>(publicStore, manifest.files.playback);
  assert.deepEqual(await savedMusicPlayback(publicStore), legacy);
  await writeJson(privateStore, "state/spotify-playback.json", { checkedAt: now.toISOString(), data: null });
  assert.equal((await publishMusicPlayback(privateStore, publicStore, now)).track?.name, "Song");
});

test("a slow history publication cannot delay or overwrite newer standalone playback", async () => {
  const privateStore = memory(), publicStore = memory();
  await writeJson(privateStore, "state/spotify-playback.json", source("Old song"));
  await publishMusic(privateStore, publicStore, now);
  let resume!: () => void, started!: () => void;
  const pending = new Promise<void>(resolve => { resume = resolve; });
  const blocked = new Promise<void>(resolve => { started = resolve; });
  const slowHistory: MusicStore = { ...publicStore, async set(key, value) { if (key === "manifest.json") { started(); await pending; } await publicStore.set(key, value); } };
  const history = publishMusic(privateStore, slowHistory, now);
  await blocked;
  await writeJson(privateStore, "state/spotify-playback.json", source("New song"));
  const fresh = await publishMusicPlayback(privateStore, publicStore, now);
  assert.equal(fresh.track?.name, "New song");
  resume(); await history;
  assert.deepEqual(await readJson(publicStore, "playback.json"), fresh);
  assert.equal((await savedMusicPlayback(publicStore))?.track?.name, "New song");
});

test("browser playback loads independently while history is pending or fails", async () => {
  const privateStore = memory(), publicStore = memory();
  await writeJson(privateStore, "state/spotify-playback.json", source());
  await publishMusic(privateStore, publicStore, now);
  const playback = await publishMusicPlayback(privateStore, publicStore, now);
  let failHistory!: () => void;
  const historyGate = new Promise<never>((_, reject) => { failHistory = () => reject(new Error("History unavailable")); });
  const reader: MusicJsonReader = async <T,>(file: string) => file === "playback.json" ? playback as T : historyGate;
  const signal = new AbortController().signal;
  const history = assert.rejects(readMusicCollection(reader, "30d", signal, new Map()), /History unavailable/);
  assert.equal(currentMusicPlayback(await readMusicPlayback(reader, signal))?.name, "Song");
  failHistory(); await history;
  assert.equal(currentMusicPlayback(await readMusicPlayback(reader, signal))?.name, "Song");
  const aborted = new AbortController(); aborted.abort();
  await assert.rejects(readMusicPlayback(reader, aborted.signal));
});

test("minute collection refreshes playback and last tracks together without creating listens", async () => {
  const privateStore = memory(), publicStore = memory(), urls: string[] = [];
  await writeJson(privateStore, "secrets/spotify.json", credentials);
  const fetcher: typeof fetch = async url => {
    urls.push(String(url));
    if (String(url).includes("/api/token")) return Response.json({ access_token: "PRIVATE-ACCESS", expires_in: 3600 });
    if (new URL(String(url)).pathname === "/v1/me/player/recently-played") return Response.json({ items: [{ played_at: now.toISOString(), track: { ...source().data.item, id: "a".repeat(22), uri: "spotify:track:" + "a".repeat(22) } }] });
    assert.equal(String(url), "https://api.spotify.com/v1/me/player");
    return Response.json(source().data);
  };
  const isolated: MusicStore = { ...privateStore, async list() { throw new Error("Minute collection must not scan history"); } };
  const result = await collectSpotifyPlayback(isolated, publicStore, { fetch: fetcher });
  assert.equal(result.status, "playing"); assert.equal(result.requests, 2);
  assert.equal(urls.length, 3);
  assert.equal((await readJson<MusicPlaybackSnapshot>(publicStore, "playback.json"))?.track?.name, "Song");
  assert.equal((await readJson<MusicPlaybackSnapshot>(publicStore, "playback.json"))?.recentTracks?.[0].name, "Song");
  assert.equal((await privateStore.list("raw/")).length, 2);
  assert.deepEqual(await privateStore.list("listens/"), []);
  assert.equal(await publicStore.get("manifest.json"), null);
});

test("history collection can skip playback without changing its source", async () => {
  const privateStore = memory(), urls: string[] = [];
  const stopped = { checkedAt: now.toISOString(), data: {} };
  await writeJson(privateStore, "secrets/spotify.json", credentials);
  await writeJson(privateStore, "state/spotify-playback.json", stopped);
  await collectSpotify(privateStore, false, 0, false, { playback: false, fetch: async url => {
    urls.push(String(url));
    if (String(url).includes("/api/token")) return Response.json({ access_token: "PRIVATE-ACCESS", expires_in: 3600 });
    assert.equal(new URL(String(url)).pathname, "/v1/me/player/recently-played");
    return Response.json({ items: [] });
  } });
  assert.equal(urls.length, 2);
  assert.deepEqual(await readJson(privateStore, "state/spotify-playback.json"), stopped);
});

test("overlapping workers share one token refresh and preserve rotation; reauthorization invalidates it", async () => {
  const store = memory(); let locked = false, refreshes = 0;
  store.acquireLock = async () => { if (locked) return null; locked = true; return async () => { locked = false; }; };
  await writeJson(store, "secrets/spotify.json", credentials);
  let start!: () => void, unblock!: () => void;
  const started = new Promise<void>(resolve => { start = resolve; });
  const gate = new Promise<void>(resolve => { unblock = resolve; });
  const fetcher: typeof fetch = async () => { refreshes++; start(); await gate; return Response.json({ access_token: "PRIVATE-ACCESS", refresh_token: "PRIVATE-ROTATED", expires_in: 3600 }); };
  const first = spotifyAccessToken(store, { fetch: fetcher });
  await started;
  const second = spotifyAccessToken(store, { fetch: fetcher, sleep: async () => { await first; } });
  unblock();
  assert.deepEqual(await Promise.all([first, second]), ["PRIVATE-ACCESS", "PRIVATE-ACCESS"]);
  assert.equal(refreshes, 1); assert.equal(locked, false);
  assert.equal((await readJson<typeof credentials>(store, "secrets/spotify.json"))?.refreshToken, "PRIVATE-ROTATED");
  await writeJson(store, "secrets/spotify.json", { ...credentials, refreshToken: "PRIVATE-REAUTHORIZED" });
  await spotifyAccessToken(store, { fetch: fetcher });
  assert.equal(refreshes, 2);
});
