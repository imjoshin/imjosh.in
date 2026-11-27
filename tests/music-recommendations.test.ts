import { strict as assert } from "node:assert";
import { test } from "node:test";
import { aggregateRecommendations, sixMonthsAgo } from "../src/lib/music/recommendations.ts";
import { musicTrack, spotifyListen } from "../src/lib/music/normalize.ts";
import { musicEntityKey } from "../src/lib/music/entity-links.ts";
import { publishMusic } from "../scripts/music/publish.ts";
import { readJson, saveListens, writeJson, type MusicStore } from "../scripts/music/store.ts";
import { readMusicCollection, type MusicJsonReader } from "../src/lib/music/collection.ts";
import type { Listen, MusicEntityDataset, MusicRecommendationsDataset } from "../src/lib/music/types.ts";

const now = new Date("2026-11-27T15:00:00Z");
function plays(count: number, artist: string, title: string, date = "2026-11-26T12:00:00Z"): Listen[] {
  return Array.from({ length: count }, (_, index) => ({ ...spotifyListen({ ts: date, master_metadata_track_name: title, master_metadata_album_artist_name: artist, ms_played: 60000 }, "PRIVATE-ORIGINAL")!, id: `${artist}:${title}:${date}:${index}`, track: musicTrack(title, [artist], { genres: ["indie pop"] }) }));
}
const memory = (): MusicStore => {
  const values = new Map<string, Uint8Array>();
  return { async get(key) { return values.get(key) || null; }, async set(key, value) { values.set(key, value); }, async list(prefix) { return [...values.keys()].filter(key => key.startsWith(prefix)); } };
};

test("recommendations rank five recent artists and show one lifetime favorite plus two recent songs", () => {
  const rows = [
    ...Array.from({ length: 7 }, (_, index) => plays(10 - index, `Artist ${index}`, "Recent song")).flat(),
    ...plays(80, "Artist 0", "Old favorite", "2014-01-01T12:00:00Z"),
    ...plays(60, "Artist 0", "Second old favorite", "2020-01-01T12:00:00Z"),
    ...plays(5, "Artist 0", "Another recent song"),
    ...plays(100, "Former favorite", "Old song", "2026-05-27T13:59:59Z"),
  ];
  const data = aggregateRecommendations(rows, now);
  assert.deepEqual(data.artists.map(artist => artist.name), Array.from({ length: 5 }, (_, index) => `Artist ${index}`));
  assert.equal(data.artists[0].plays, 15);
  assert.deepEqual(data.artists[0].tracks.map(track => [track.name, track.plays, track.period]), [["Old favorite", 80, "all"], ["Recent song", 10, "6m"], ["Another recent song", 5, "6m"]]);
  assert.equal(data.artists[1].tracks.length, 1);
  assert.equal(JSON.stringify(data).includes("PRIVATE-ORIGINAL"), false);
});

test("recent picks exclude the lifetime winner even when it leads recently and rank by six-month counts", () => {
  const data = aggregateRecommendations([
    ...plays(200, "Artist", "Lifetime winner", "2020-01-01T12:00:00Z"), ...plays(20, "Artist", "Lifetime winner"),
    ...plays(1, "Artist", "Recent first", "2020-01-01T12:00:00Z"), ...plays(10, "Artist", "Recent first"),
    ...plays(50, "Artist", "Recent second", "2020-01-01T12:00:00Z"), ...plays(5, "Artist", "Recent second"),
    ...plays(100, "Artist", "Older favorite", "2020-01-01T12:00:00Z"), ...plays(3, "Artist", "Older favorite"),
  ], now);
  const tracks = data.artists[0].tracks;
  assert.deepEqual(tracks.map(track => [track.name, track.plays, track.period]), [["Lifetime winner", 220, "all"], ["Recent first", 10, "6m"], ["Recent second", 5, "6m"]]);
  assert.equal(new Set(tracks.map(track => track.key)).size, 3);
});

test("six-month boundaries preserve Eastern wall time, clamp short months, and include the exact cutoff", () => {
  assert.equal(new Date(sixMonthsAgo(now)).toISOString(), "2026-05-27T14:00:00.000Z");
  assert.equal(new Date(sixMonthsAgo(new Date("2026-08-31T16:00:00Z"))).toISOString(), "2026-02-28T17:00:00.000Z");
  const data = aggregateRecommendations([...plays(1, "Boundary", "Included", "2026-05-27T14:00:00Z"), ...plays(1, "Outside", "Excluded", "2026-05-27T13:59:59Z")], now);
  assert.deepEqual(data.artists.map(artist => artist.name), ["Boundary"]);
});

test("recommendations exclude kids, Disney, private, future, and duplicate events without modifying originals", () => {
  const good = plays(1, "Good", "Good")[0];
  good.track.artists = ["Good", "GOOD"];
  const kids = plays(30, "Kids", "Excluded").map(row => ({ ...row, track: { ...row.track, genres: ["kids music"] } }));
  const disney = plays(30, "Disney", "Excluded").map(row => ({ ...row, track: { ...row.track, album: "Frozen" } }));
  const privateRows = plays(30, "Private", "Excluded").map(row => ({ ...row, privateSession: true }));
  const rows = [good, good, ...kids, ...disney, ...privateRows, ...plays(30, "Future", "Excluded", "2027-01-01T12:00:00Z")];
  const original = JSON.stringify(rows), data = aggregateRecommendations(rows, now);
  assert.equal(JSON.stringify(rows), original);
  assert.equal(data.artists.length, 1); assert.equal(data.artists[0].plays, 1); assert.equal(data.artists[0].tracks[0].plays, 1);
  assert.deepEqual(aggregateRecommendations([], now).artists, []);
});

test("publication enriches recommendations from saved photos and includes song hover metadata outside the global top 100", async () => {
  const privateStore = memory(), publicStore = memory();
  const rows = [...plays(3, "Recent", "Small favorite"), ...plays(2, "Recent", "Another small favorite"), ...plays(4, "Recent", "Old small favorite", "2020-01-01T12:00:00Z"), ...Array.from({ length: 101 }, (_, index) => plays(5, `Old ${index}`, `Global ${index}`, "2020-01-01T12:00:00Z")).flat()];
  await saveListens(privateStore, rows);
  const image = "https://i.scdn.co/image/saved-portrait", artistId = "A".repeat(22);
  await writeJson(privateStore, "catalog/artist_images.json", { recent: { name: "Recent", spotifyArtistId: artistId, images: [{ url: image, width: 640, height: 640 }], fetchedAt: now.toISOString() } });
  const { manifest } = await publishMusic(privateStore, publicStore, now);
  const data = await readJson<MusicRecommendationsDataset>(publicStore, manifest.files.recommendations);
  assert.equal(data?.artists[0].image, image); assert.equal(data?.artists[0].url, `https://open.spotify.com/artist/${artistId}`);
  assert.deepEqual(data?.artists[0].tracks.map(track => [track.plays, track.period]), [[4, "all"], [3, "6m"], [2, "6m"]]);
  const entities = await readJson<MusicEntityDataset>(publicStore, manifest.files.entities);
  assert.equal(entities?.entities[musicEntityKey("track", "Old small favorite", ["Recent"])].plays, 4);
  const read: MusicJsonReader = async <T,>(file: string) => (await readJson<T>(publicStore, file))!;
  const cache = new Map<string, unknown>(), signal = new AbortController().signal;
  const initial = await readMusicCollection(read, "30d", signal, cache);
  assert.deepEqual(initial.recommendations, data);
  const changedPeriod = await readMusicCollection(read, "all", signal, cache);
  assert.equal(changedPeriod.recommendations, initial.recommendations);
  const older = { ...manifest, files: { ...manifest.files } }; delete older.files.recommendations;
  assert.equal((await readMusicCollection(read, "all", signal, cache, older)).recommendations, null);
});
