import { strict as assert } from "node:assert";
import { test } from "node:test";
import { publicSpotifyRecentTracks, recentTracksFromListens } from "../src/lib/music/recent-tracks.ts";
import { collectSpotifyPlayback, publishMusicPlayback } from "../scripts/music/playback.ts";
import { publishMusic } from "../scripts/music/publish.ts";
import { readJson, saveListens, writeJson, type MusicStore } from "../scripts/music/store.ts";
import { spotifyListen } from "../src/lib/music/normalize.ts";
import type { MusicPlaybackSnapshot } from "../src/lib/music/types.ts";

const now = new Date("2026-11-27T17:00:00Z");
const row = (name: string, minutes: number) => ({ played_at: new Date(now.getTime() - minutes * 60000).toISOString(), context: { uri: "PRIVATE-PLAYLIST" }, track: { id: "a".repeat(22), uri: `spotify:track:${name}`, type: "track", name, artists: [{ name: "Artist" }], album: { name: "Album", images: [{ url: "https://i.scdn.co/image/cover" }] }, external_urls: { spotify: "https://open.spotify.com/track/" + "a".repeat(22) }, duration_ms: 180000 } });
const memory = (): MusicStore => {
  const values = new Map<string, Uint8Array>();
  return { async get(key) { return values.get(key) || null; }, async set(key, value) { values.set(key, value); }, async list(prefix) { return [...values.keys()].filter(key => key.startsWith(prefix)); } };
};

test("last tracks retain repeated songs as separate plays, deduplicate events, and publish only six approved metadata records", () => {
  const items = [row("Repeat", 1), row("Repeat", 3), ...Array.from({ length: 7 }, (_, i) => row(`Song ${i}`, i + 4))];
  const before = JSON.stringify(items);
  const recent = publicSpotifyRecentTracks({ checkedAt: now.toISOString(), data: { items: [...items].reverse().concat(items[0]) } }, {}, now)!;
  assert.equal(recent.length, 6);
  assert.deepEqual(recent.slice(0, 2).map(track => track.name), ["Repeat", "Repeat"]);
  assert.notEqual(recent[0].id, recent[1].id); assert.equal(recent[0].key, recent[1].key);
  assert.equal(recent[0].image, "https://i.scdn.co/image/cover");
  for (const field of ["played_at", "playedAt", "PRIVATE-PLAYLIST", "duration_ms", "rawRef", "msPlayed", "timestamp"]) assert.equal(JSON.stringify(recent).includes(field), false);
  assert.equal(JSON.stringify(items), before);
  const updated = publicSpotifyRecentTracks({ checkedAt: now.toISOString(), data: { items: [row("Newest", 0), ...items] } }, {}, now)!;
  assert.deepEqual(updated.slice(1).map(track => track.id), recent.slice(0, 5).map(track => track.id));
});

test("last tracks apply public exclusions, trusted image URLs, and distinguish unavailable from empty history", () => {
  const kids = row("Kids", 1); kids.track.artists[0].name = "Kids artist";
  const disney = row("Disney", 2); disney.track.album.name = "Frozen";
  const local = { ...row("Local", 3), track: { ...row("Local", 3).track, is_local: true } };
  const episode = row("Podcast", 4); episode.track.type = "episode";
  const privatePlay = { ...row("Private", 5), incognito_mode: true };
  const untrusted = row("No image", 6); untrusted.track.album.images[0].url = "https://untrusted.test/image";
  const source = { checkedAt: now.toISOString(), data: { items: [kids, disney, local, episode, privatePlay, row("Future", -1), untrusted] } };
  const recent = publicSpotifyRecentTracks(source, { "kids artist": { genres: ["children's music"] } }, now)!;
  assert.deepEqual(recent.map(track => track.name), ["No image"]); assert.equal(recent[0].image, null);
  assert.equal(publicSpotifyRecentTracks(null, {}, now), null);
  assert.equal(publicSpotifyRecentTracks({ checkedAt: "invalid", data: { items: [] } }, {}, now), null);
  assert.deepEqual(publicSpotifyRecentTracks({ checkedAt: now.toISOString(), data: { items: [] } }, {}, now), []);
});

test("playback publication retains last tracks across unavailable updates and clears only a confirmed empty response", async () => {
  const privateStore = memory(), publicStore = memory();
  await writeJson(privateStore, "state/spotify-last-tracks.json", { checkedAt: now.toISOString(), data: { items: [row("Recent", 1)] } });
  const first = await publishMusicPlayback(privateStore, publicStore, now);
  assert.equal(first.recentTracks?.[0].name, "Recent");
  await writeJson(privateStore, "state/spotify-last-tracks.json", { checkedAt: now.toISOString(), data: null });
  assert.deepEqual((await publishMusicPlayback(privateStore, publicStore, now)).recentTracks, first.recentTracks);
  await writeJson(privateStore, "state/spotify-last-tracks.json", { checkedAt: now.toISOString(), data: { items: [] } });
  assert.deepEqual((await publishMusicPlayback(privateStore, publicStore, now)).recentTracks, []);
  assert.equal(await publicStore.get("manifest.json"), null);
});

test("legacy publication bundles recent approved Spotify metadata without changing totals or exposing event dates", async () => {
  const privateStore = memory(), publicStore = memory();
  const listens = [row("Recent", 1), row("Older", 2)].map(item => spotifyListen(item, "PRIVATE-RAW")!);
  await saveListens(privateStore, listens);
  const { manifest } = await publishMusic(privateStore, publicStore, now);
  const playback = (await readJson<MusicPlaybackSnapshot>(publicStore, manifest.files.playback))!;
  assert.deepEqual(playback.recentTracks, recentTracksFromListens(listens, now));
  assert.equal(JSON.stringify(playback).includes("PRIVATE-RAW"), false);
});

test("a failed recent endpoint still publishes fresh Now Playing with the previous recent metadata", async () => {
  const privateStore = memory(), publicStore = memory();
  await writeJson(privateStore, "secrets/spotify.json", { clientId: "client", refreshToken: "PRIVATE-TOKEN" });
  await writeJson(privateStore, "state/spotify-last-tracks.json", { checkedAt: now.toISOString(), data: { items: [row("Recent", 1)] } });
  await collectSpotifyPlayback(privateStore, publicStore, { fetch: async url => {
    if (String(url).includes("/api/token")) return Response.json({ access_token: "PRIVATE-ACCESS", expires_in: 3600 });
    if (String(url).includes("recently-played")) return new Response(null, { status: 403 });
    return Response.json({ is_playing: true, currently_playing_type: "track", device: { is_private_session: false }, item: row("Now", 0).track });
  } });
  const playback = (await readJson<MusicPlaybackSnapshot>(publicStore, "playback.json"))!;
  assert.equal(playback.track?.name, "Now"); assert.equal(playback.recentTracks?.[0].name, "Recent");
});
