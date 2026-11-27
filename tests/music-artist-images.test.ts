import { strict as assert } from "node:assert";
import { test } from "node:test";
import { gunzipSync } from "node:zlib";
import { ARTIST_IMAGES_FILE, collectArtistImages, mergeArtistImages, rememberArtistImages, type ArtistImages } from "../scripts/music/artist-images.ts";
import { createSpotifyRequester, type SpotifyRequest } from "../scripts/music/spotify-request.ts";
import { publishMusic } from "../scripts/music/publish.ts";
import { readJson, saveListens, writeJson, type MusicStore } from "../scripts/music/store.ts";
import { musicTrack } from "../src/lib/music/normalize.ts";
import { musicEntityKey } from "../src/lib/music/entity-links.ts";
import type { Listen, MusicDataset, MusicEntityDataset, MusicPlaybackSnapshot, MusicSoundtrackDataset, SpotifySnapshot } from "../src/lib/music/types.ts";

const now = new Date("2026-11-27T15:00:00Z"), artistId = "a".repeat(22);
const photo = (name: string) => `https://i.scdn.co/image/${name}`;
const artist = (name = "Artist", image = "fresh", id = artistId) => ({ name, id, images: image ? [{ url: photo(image), width: 640, height: 640 }] : [] });
const memory = (): MusicStore => {
  const values = new Map<string, Uint8Array>();
  return { async get(key) { return values.get(key) || null; }, async set(key, value) { values.set(key, value); }, async list(prefix) { return [...values.keys()].filter(key => key.startsWith(prefix)); } };
};
const listens = (name: string, count: number): Listen[] => Array.from({ length: count }, (_, i) => ({ version: 1, id: `${name}-${i}`, platform: i % 2 ? "spotify" : "google-play-music", source: "takeout", playedAt: "2026-11-26T15:00:00Z", timestampKind: "activity", timestampPrecision: "second", msPlayed: null, trackDurationMs: null, skipped: null, privateSession: false, media: "music", track: musicTrack("Song", [name], { album: "Album" }), rawRef: "PRIVATE-RAW#1" }));
const entry = (name = "Artist", image = "cached", updatedAt = "2026-11-25T15:00:00Z"): ArtistImages => ({ [name.toLowerCase()]: { name, spotifyArtistId: artistId, images: artist(name, image).images, updatedAt } });

test("Spotify photos replace saved photos, while empty/invalid responses and older merges preserve them", () => {
  const catalog = entry();
  assert.equal(rememberArtistImages(catalog, artist(), now.toISOString()), true);
  assert.equal(catalog.artist.images[0].url, photo("fresh"));
  assert.equal(rememberArtistImages(catalog, artist("Artist", ""), now.toISOString()), false);
  assert.equal(rememberArtistImages(catalog, { ...artist(), images: [{ url: "https://evil.test/photo" }] }, now.toISOString()), false);
  assert.equal(catalog.artist.images[0].url, photo("fresh"));
  assert.equal(mergeArtistImages(catalog, entry()).artist.images[0].url, photo("fresh"));
  assert.equal(mergeArtistImages(entry(), catalog).artist.images[0].url, photo("fresh"));
});

test("image requests require more than 50 cumulative plays or active public playback, prioritizing playback", async () => {
  const store = memory();
  const rows = [...listens("Eligible", 51), ...listens("Boundary", 50), ...listens("Private", 51).map(row => ({ ...row, privateSession: true }))];
  // Duplicate normalized credits must not push a 50-play artist over the threshold.
  for (const row of rows.filter(row => row.track.artists[0] === "Boundary")) row.track.artists.push("BOUNDARY");
  await saveListens(store, rows);
  await writeJson(store, "catalog/spotify-tracks.json.gz", Object.fromEntries(["Eligible", "Boundary", "Private", "Playing"].map((name, i) => [name, { artists: [{ name, id: String(i).repeat(22) }] }])));
  await writeJson(store, "state/spotify-playback.json", { checkedAt: now.toISOString(), data: { is_playing: true, currently_playing_type: "track", device: { is_private_session: false }, item: { type: "track", name: "Current", artists: [{ name: "Playing", id: "3".repeat(22) }] } } });
  const calls: string[] = [];
  const request: SpotifyRequest = async (path, optional) => {
    assert.equal(optional, true); calls.push(path);
    return { data: artist(path.endsWith("3".repeat(22)) ? "Playing" : "Eligible"), rawRef: "raw" };
  };
  await collectArtistImages(store, [], request, now);
  assert.deepEqual(calls, [`artists/${"3".repeat(22)}`, `artists/${"0".repeat(22)}`]);
  assert.deepEqual(Object.keys((await readJson<ArtistImages>(store, ARTIST_IMAGES_FILE))!).sort(), ["eligible", "playing"]);
});

test("fresh images overwrite the catalog without fetching; missing provider photos reuse the catalog", async () => {
  const store = memory(); await saveListens(store, listens("Artist", 51));
  await writeJson(store, ARTIST_IMAGES_FILE, entry());
  const never: SpotifyRequest = async () => { throw new Error("A cached photo should avoid this request"); };
  await collectArtistImages(store, [artist()], never, now);
  assert.equal((await readJson<ArtistImages>(store, ARTIST_IMAGES_FILE))!.artist.images[0].url, photo("fresh"));
  await collectArtistImages(store, [artist("Artist", "")], never, now);
  assert.equal((await readJson<ArtistImages>(store, ARTIST_IMAGES_FILE))!.artist.images[0].url, photo("fresh"));
});

test("Spotify ampersand spellings match historical and credits without changing recorded names", async () => {
  const store = memory(); await saveListens(store, listens("Strings And Heart", 51));
  const calls: string[] = [];
  const request: SpotifyRequest = async path => {
    calls.push(path);
    return { data: path.startsWith("search?") ? { artists: { items: [artist("Strings & Heart")] } } : artist("Strings & Heart"), rawRef: "raw" };
  };
  await collectArtistImages(store, [], request, now);
  assert.equal(calls.length, 2);
  const images = (await readJson<ArtistImages>(store, ARTIST_IMAGES_FILE))!;
  assert.equal(images["strings and heart"].images[0].url, photo("fresh"));
  assert.equal(images["strings and heart"].name, "Strings And Heart");
  assert.deepEqual(Object.keys(images), ["strings and heart"]);
});

test("becoming active bypasses a background miss cooldown, while private playback does not qualify", async () => {
  const store = memory();
  await writeJson(store, "state/artist-images.json", { playing: { retryAt: now.getTime() + 86400000, active: false } });
  const playback = { checkedAt: now.toISOString(), data: { is_playing: true, currently_playing_type: "track", device: { is_private_session: true }, item: { type: "track", name: "Song", artists: [{ name: "Playing", id: artistId }] } } };
  await writeJson(store, "state/spotify-playback.json", playback);
  let calls = 0;
  const request: SpotifyRequest = async () => { calls++; return { data: artist("Playing"), rawRef: "raw" }; };
  await collectArtistImages(store, [], request, now); assert.equal(calls, 0);
  playback.data.device.is_private_session = false;
  await writeJson(store, "state/spotify-playback.json", playback);
  await collectArtistImages(store, [], request, now); assert.equal(calls, 1);
  assert.equal((await readJson<ArtistImages>(store, ARTIST_IMAGES_FILE))!.playing.images[0].url, photo("fresh"));
});

test("empty artist responses are retried later and name lookup rejects ambiguous artists", async () => {
  const store = memory(); await saveListens(store, listens("Artist", 51));
  let calls = 0;
  const ambiguous: SpotifyRequest = async () => { calls++; return { data: { artists: { items: [artist(), artist("Artist", "other", "b".repeat(22))] } }, rawRef: "raw" }; };
  await collectArtistImages(store, [], ambiguous, now);
  assert.equal(calls, 1); assert.deepEqual(await readJson(store, ARTIST_IMAGES_FILE), {});
  await writeJson(store, "catalog/genres.json", { artist: { artistId, genres: [] } });
  const empty: SpotifyRequest = async () => { calls++; return { data: artist("Artist", ""), rawRef: "raw" }; };
  const later = new Date(now.getTime() + 16 * 60000);
  await collectArtistImages(store, [], empty, later);
  assert.equal(calls, 2);
  await collectArtistImages(store, [], empty, new Date(later.getTime() + 60000));
  assert.equal(calls, 2);
});

test("artist requests honor Retry-After, retry transient failures, and defer persistent limits without failing", async () => {
  const store = memory(), waits: number[] = [];
  let clock = now.getTime(), calls = 0;
  const requester = await createSpotifyRequester(store, "PRIVATE-TOKEN", now.toISOString(), {
    now: () => clock, sleep: async ms => { waits.push(ms); clock += ms; },
    fetch: async () => { calls++; return calls === 1 ? new Response(null, { status: 429, headers: { "Retry-After": "2" } }) : calls === 2 ? new Response(null, { status: 503 }) : Response.json(artist()); },
  });
  assert.equal((await requester.request(`artists/${artistId}`, true))?.data.name, "Artist");
  assert.deepEqual(waits, [2000, 2000]);
  const raw = await store.get((await store.list("raw/"))[0]);
  assert.equal(gunzipSync(raw!).toString("utf8").includes("PRIVATE-TOKEN"), false);
  const limited = await createSpotifyRequester(store, "token", now.toISOString(), { now: () => clock, sleep: async () => { throw new Error("Must defer long waits"); }, fetch: async () => { calls++; return new Response(null, { status: 429, headers: { "Retry-After": "120" } }); } });
  assert.equal(await limited.request(`artists/${artistId}`, true), null);
  const afterLimit = calls;
  assert.equal(await limited.request("artists/another", true), null); assert.equal(calls, afterLimit);
  const nextRun = await createSpotifyRequester(store, "token", now.toISOString(), { now: () => clock, fetch: async () => { throw new Error("Cooldown must survive another run"); } });
  assert.equal(await nextRun.request(`artists/${artistId}`, true), null);
});

test("exhausted short rate limits and network errors remain optional", async () => {
  for (const networkFailure of [false, true]) {
    const store = memory(), waits: number[] = []; let clock = now.getTime();
    const client = await createSpotifyRequester(store, "token", now.toISOString(), { now: () => clock, sleep: async ms => { waits.push(ms); clock += ms; }, fetch: async () => { if (networkFailure) throw new Error("offline"); return new Response(null, { status: 429, headers: { "Retry-After": "1" } }); } });
    assert.equal(await client.request(`artists/${artistId}`, true), null);
    assert.equal(client.stats.requests, 3); assert.deepEqual(waits, [1000, 2000]);
  }
});

test("publication uses Spotify photos first and saved photos throughout rankings, charts, lazy details, and playback artists", async () => {
  const store = memory(), published = memory(); await saveListens(store, listens("Artist", 51));
  await writeJson(store, ARTIST_IMAGES_FILE, { ...entry(), ...entry("Playing", "playing") });
  await writeJson(store, "public/spotify.json", { generatedAt: now.toISOString(), ranges: { short_term: { tracks: [], artists: [{ key: artistId, name: "Artist", artists: [], image: null, url: null, plays: 0, msPlayed: 0 }] } }, playlists: [] });
  await writeJson(store, "state/spotify-playback.json", { checkedAt: now.toISOString(), data: { is_playing: true, currently_playing_type: "track", device: { is_private_session: false }, item: { type: "track", name: "Current", artists: [{ name: "Playing", id: artistId }] } } });
  const verify = async (expected: string) => {
    const { manifest } = await publishMusic(store, published, now);
    const history = (await readJson<MusicDataset>(published, manifest.files["all/all"]))!;
    assert.equal(history.stats.topArtists[0].image, expected);
    const entities = (await readJson<MusicEntityDataset>(published, manifest.files.entities))!;
    assert.equal(entities.entities[musicEntityKey("artist", "Artist")].image, expected);
    assert.equal(entities.entities[musicEntityKey("artist", "Playing")].image, photo("playing"));
    assert.equal(entities.entities[musicEntityKey("artist", "Playing")].plays, 0);
    const playback = (await readJson<MusicPlaybackSnapshot>(published, manifest.files.playback))!;
    assert.deepEqual(playback.artistImages, [{ name: "Playing", image: photo("playing") }]);
    const soundtrack = (await readJson<MusicSoundtrackDataset>(published, manifest.files["all/soundtrack/all"]))!;
    assert.equal(soundtrack.metrics.artists.series[0].image, expected);
    const songs = (await readJson<MusicEntityDataset>(published, soundtrack.songFiles!.artists!.artist))!;
    assert.equal(songs.entities[musicEntityKey("artist", "Artist")].image, expected);
    assert.equal(JSON.stringify(entities).includes("PRIVATE-RAW"), false);
    return manifest;
  };
  const fallback = await verify(photo("cached"));
  assert.equal((await readJson<SpotifySnapshot>(published, fallback.files.spotify))!.ranges.short_term.artists[0].image, photo("cached"));
  await writeJson(store, "public/spotify.json", { generatedAt: now.toISOString(), ranges: { short_term: { tracks: [], artists: [{ key: artistId, name: "Artist", artists: [], image: photo("provider"), url: null, plays: 0, msPlayed: 0 }] } }, playlists: [] });
  await verify(photo("provider"));
});

test("now playing carries its photo when the artist drops out of longer periods' top 100", async () => {
  const store = memory(), published = memory();
  const olderFavorites = Array.from({ length: 101 }, (_, i) => listens(`Older favorite ${i}`, 2).map(listen => ({ ...listen, playedAt: "2026-08-26T15:00:00Z" }))).flat();
  await saveListens(store, [...olderFavorites, ...listens("Playing", 1)]);
  await writeJson(store, ARTIST_IMAGES_FILE, entry("Playing", "playing"));
  await writeJson(store, "state/spotify-playback.json", { checkedAt: now.toISOString(), data: { is_playing: true, currently_playing_type: "track", device: { is_private_session: false }, item: { type: "track", name: "Current", artists: [{ name: "Playing", id: artistId }] } } });
  const { manifest } = await publishMusic(store, published, now);
  for (const period of ["30d", "365d", "all", "2026"]) {
    const history = (await readJson<MusicDataset>(published, manifest.files[`all/${period}`]))!;
    assert.equal(history.stats.topArtists.some(artist => artist.name === "Playing"), period === "30d");
    const playback = (await readJson<MusicPlaybackSnapshot>(published, manifest.files.playback))!;
    assert.deepEqual(playback.artistImages, [{ name: "Playing", image: photo("playing") }], period);
  }
});
