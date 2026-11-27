import { strict as assert } from "node:assert";
import { test } from "node:test";
import { aggregateEntities } from "../src/lib/music/entities.ts";
import { directSpotifyUrl, musicEntityKey, spotifyEntityUrl } from "../src/lib/music/entity-links.ts";
import { musicTrack, spotifyListen } from "../src/lib/music/normalize.ts";
import { aggregateMusic } from "../src/lib/music/aggregate.ts";
import { aggregateSeasons } from "../src/lib/music/seasons.ts";
import type { Listen } from "../src/lib/music/types.ts";
import type { MusicDataset, MusicEntityDataset, MusicManifest, MusicSeasonalDataset } from "../src/lib/music/types.ts";
import { publishMusic } from "../scripts/music/publish.ts";
import { readJson, saveListens, writeJson, type MusicStore } from "../scripts/music/store.ts";

const now = new Date("2026-11-26T20:00:00Z");
const event = (id: string, date: string, names = ["Artist"]): Listen => ({ ...spotifyListen({ played_at: date, track: { name: "Song", artists: names.map(name => ({ name })), album: { name: "Album", artists: [{ name: "Artist" }] } } }, "PRIVATE-RAW")!, id });

test("entity totals join platforms, deduplicate credits, and use Eastern calendar dates without exposing event times", () => {
  const first = event("one", "2024-01-01T02:00:00Z", ["Artist", "Artist"]);
  first.track = musicTrack("Song", ["Artist"], { album: "Album", albumArtists: ["Artist"], genres: ["indie"], image: "https://i.scdn.co/image/cover" });
  const last = { ...event("two", "2026-11-26T18:00:00Z"), platform: "google-play-music" as const, source: "takeout" as const, msPlayed: 90000 };
  const privateEvent = { ...event("private", "2026-11-25T18:00:00Z"), privateSession: true };
  const kids = { ...event("kids", "2026-11-25T18:00:00Z"), track: musicTrack("Kids", ["Kids"], { genres: ["kids music"] }) };
  const disney = { ...event("disney", "2026-11-25T18:00:00Z"), track: musicTrack("Disney song", ["Disney"]) };
  const rows = [last, privateEvent, first, first, kids, disney, event("future", "2030-01-01T12:00:00Z")];
  const original = JSON.stringify(rows);
  const result = aggregateEntities(rows, [], [], now);
  for (const kind of ["track", "artist", "album"] as const) {
    const entity = result.entities[musicEntityKey(kind, kind === "track" ? "Song" : kind === "artist" ? "Artist" : "Album", ["Artist"])];
    assert.equal(entity.plays, 2); assert.equal(entity.firstListen, "2023-12-31"); assert.equal(entity.lastListen, "2026-11-26");
    assert.equal(entity.msPlayed, 90000); assert.equal(entity.durationKnown, 1); assert.equal(entity.tracks, 1);
  }
  assert.equal(JSON.stringify(rows), original);
  const text = JSON.stringify(result);
  for (const value of ["PRIVATE-RAW", "privateSession", "2024-01-01T02", "Kids", "Disney", "2030-"]) assert.equal(text.includes(value), false);
});

test("album totals combine guest tracks using actual album artists across rankings, seasons, and hover cards", () => {
  const rows = [event("solo", "2026-11-24T12:00:00Z"), event("guest", "2026-11-25T12:00:00Z", ["Artist", "Guest"])];
  const album = aggregateEntities(rows, [], [], now).entities[musicEntityKey("album", "Album", ["Artist"])];
  assert.equal(album.plays, 2); assert.equal(album.tracks, 2);
  assert.equal(aggregateMusic(rows, now).datasets["all/all"].stats.topAlbums.length, 1);
  assert.deepEqual(aggregateSeasons(rows, now)["all/seasons"].metrics.albums.series[0].plays, [2]);
});

test("affinity metadata supplies zero-recorded-history cards without publishing the private library", () => {
  const result = aggregateEntities([], [{ kind: "track", name: "Favorite", artists: ["Artist"] }], [
    { kind: "track", name: "Favorite", artists: ["Artist"], album: "Album", albumArtists: ["Artist"], url: "https://open.spotify.com/track/1234567890123456789012" },
    { kind: "track", name: "Private library song", artists: ["Other"] },
  ], now);
  assert.equal(Object.values(result.entities).length, 3);
  const favorite = result.entities[musicEntityKey("track", "Favorite", ["Artist"])];
  assert.equal(favorite.plays, 0); assert.equal(favorite.firstListen, null); assert.equal(favorite.lastListen, null);
  assert.equal(favorite.url, "https://open.spotify.com/track/1234567890123456789012");
  assert.equal(JSON.stringify(result).includes("Private library song"), false);
});

test("Spotify links use the right entity type, validate destinations, and search safely when an ID is unknown", () => {
  assert.equal(musicEntityKey("album", " Album  ", ["ARTIST", "Guest", "artist"]), musicEntityKey("album", "album", ["guest", "artist"]));
  assert.equal(directSpotifyUrl("https://open.spotify.com/artist/1234567890123456789012?si=tracking", "artist"), "https://open.spotify.com/artist/1234567890123456789012");
  for (const value of ["javascript:alert(1)", "https://open.spotify.com.evil.test/artist/1234567890123456789012", "https://open.spotify.com/track/1234567890123456789012", "https://evil@open.spotify.com/artist/1234567890123456789012"]) assert.equal(directSpotifyUrl(value, "artist"), null);
  const fallback = new URL(spotifyEntityUrl({ kind: "album", name: "A & B / Deluxe", artists: ["Artist"] }));
  assert.equal(fallback.origin, "https://open.spotify.com");
  assert.equal(decodeURIComponent(fallback.pathname), '/search/album:"A & B / Deluxe" artist:"Artist"');
});

test("publication supplies direct entity links to rankings and seasonal tables while whitelisting hover metadata", async () => {
  const memory = (): MusicStore => {
    const values = new Map<string, Uint8Array>();
    return { async get(key) { return values.get(key) || null; }, async set(key, value) { values.set(key, value); }, async list(prefix) { return [...values.keys()].filter(key => key.startsWith(prefix)); } };
  };
  const privateStore = memory(), publicStore = memory();
  await saveListens(privateStore, [event("one", "2026-11-25T12:00:00Z")]);
  const artistId = "aaaaaaaaaaaaaaaaaaaaaa", albumId = "bbbbbbbbbbbbbbbbbbbbbb", trackId = "cccccccccccccccccccccc";
  await writeJson(privateStore, "catalog/spotify-tracks.json.gz", { [trackId]: { id: trackId, name: "Song", artists: [{ id: artistId, name: "Artist" }], album: { id: albumId, name: "Album", artists: [{ id: artistId, name: "Artist" }] }, privateField: "PRIVATE-CATALOG-FIELD" } });
  await publishMusic(privateStore, publicStore, now);
  const manifest = (await readJson<MusicManifest>(publicStore, "manifest.json"))!;
  const stats = (await readJson<MusicDataset>(publicStore, manifest.files["all/all"]))!.stats;
  assert.equal(stats.topTracks[0].url, `https://open.spotify.com/track/${trackId}`);
  assert.equal(stats.topArtists[0].url, `https://open.spotify.com/artist/${artistId}`);
  assert.equal(stats.topAlbums[0].url, `https://open.spotify.com/album/${albumId}`);
  const seasonal = (await readJson<MusicSeasonalDataset>(publicStore, manifest.files["all/seasons"]))!;
  assert.equal(seasonal.metrics.albums.series[0].url, stats.topAlbums[0].url);
  const entities = (await readJson<MusicEntityDataset>(publicStore, manifest.files.entities))!;
  assert.equal(Object.values(entities.entities).length, 3);
  assert.equal(JSON.stringify(entities).includes("PRIVATE-CATALOG-FIELD"), false);
});

test("public hover downloads cover displayed music while totals retain history outside the rankings", async () => {
  const memory = (): MusicStore => {
    const values = new Map<string, Uint8Array>();
    return { async get(key) { return values.get(key) || null; }, async set(key, value) { values.set(key, value); }, async list(prefix) { return [...values.keys()].filter(key => key.startsWith(prefix)); } };
  };
  const privateStore = memory(), publicStore = memory();
  const rows = Array.from({ length: 34 }, (_, i) => ({ ...event(`play-${i}`, "2026-11-25T12:00:00Z"), track: musicTrack(`Song ${i}`, ["Artist"], { album: "Album", albumArtists: ["Artist"] }) }));
  await saveListens(privateStore, rows);
  await writeJson(privateStore, "public/spotify.json", { generatedAt: now.toISOString(), playlists: [], ranges: { short_term: { artists: [], tracks: [{ key: "favorite", name: "Affinity favorite", artists: ["Favorite artist"], plays: 0, msPlayed: 0, image: null, url: null }] } } });
  await publishMusic(privateStore, publicStore, now);
  const manifest = (await readJson<MusicManifest>(publicStore, "manifest.json"))!;
  const stats = (await readJson<MusicDataset>(publicStore, manifest.files["all/all"]))!.stats;
  const entities = (await readJson<MusicEntityDataset>(publicStore, manifest.files.entities))!.entities;
  assert.equal(stats.plays, 34);
  assert.equal(entities[musicEntityKey("artist", "Artist")].plays, 34);
  assert.equal(entities[musicEntityKey("album", "Album", ["Artist"])].tracks, 34);
  for (const track of stats.topTracks) assert.ok(entities[musicEntityKey("track", track.name, track.artists)]);
  const displayed = new Set(stats.topTracks.map(track => track.name));
  const omitted = rows.filter(row => !displayed.has(row.track.title));
  assert.equal(omitted.length, 4);
  for (const row of omitted) assert.equal(entities[musicEntityKey("track", row.track.title, row.track.artists)], undefined);
  assert.ok(entities[musicEntityKey("track", "Affinity favorite", ["Favorite artist"])]);
  assert.ok(entities[musicEntityKey("artist", "Favorite artist")]);
  assert.equal((await privateStore.list("listens/")).length, 1);
  assert.equal((await readJson<Listen[]>(privateStore, "listens/spotify/2026-11.json.gz"))!.length, 34);
});
