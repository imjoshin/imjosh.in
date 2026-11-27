import { strict as assert } from "node:assert";
import { test } from "node:test";
import { aggregateArtistHistory } from "../src/lib/music/artist-history.ts";
import { aggregateMusic } from "../src/lib/music/aggregate.ts";
import { musicTrack, spotifyListen } from "../src/lib/music/normalize.ts";
import { musicEntityKey } from "../src/lib/music/entity-links.ts";
import { readMusicCollection, type MusicJsonReader } from "../src/lib/music/collection.ts";
import { publishMusic } from "../scripts/music/publish.ts";
import { readJson, saveListens, type MusicStore } from "../scripts/music/store.ts";
import type { Listen, MusicArtistHistoryDataset, MusicEntityDataset } from "../src/lib/music/types.ts";

const now = new Date("2026-11-27T15:00:00Z");
function plays(count: number, name: string, date: string, genres = ["indie pop"]): Listen[] {
  return Array.from({ length: count }, (_, index) => ({ ...spotifyListen({ ts: date, master_metadata_track_name: name, master_metadata_album_artist_name: name, ms_played: 60000 }, "PRIVATE-ORIGINAL")!, id: `${name}:${date}:${index}`, track: musicTrack(name, [name], { genres }) }));
}
const fixture = () => [
  ...Array.from({ length: 5 }, (_, index) => plays(150, `Evergreen ${index}`, "2020-01-15T12:00:00Z")).flat(),
  ...plays(40, "Recent main", "2026-11-26T12:00:00Z"), ...plays(30, "Recent second", "2025-04-15T12:00:00Z"),
  ...plays(120, "Past peak", "2018-05-15T12:00:00Z"), ...plays(110, "Past second", "2017-09-15T12:00:00Z"),
  ...plays(4, "Sparse peak", "2019-03-15T12:00:00Z"),
];
const memory = (): MusicStore => {
  const values = new Map<string, Uint8Array>();
  return { async get(key) { return values.get(key) || null; }, async set(key, value) { values.set(key, value); }, async list(prefix) { return [...values.keys()].filter(key => key.startsWith(prefix)); } };
};

test("artist history separates lifetime favorites, recent leaders, and older significant peaks", () => {
  const data = aggregateArtistHistory(fixture(), now);
  assert.deepEqual(data.groups[0].artists.map(artist => artist.name), Array.from({ length: 5 }, (_, index) => `Evergreen ${index}`));
  assert.deepEqual(data.groups[1].artists.map(artist => artist.name), ["Recent main", "Recent second"]);
  assert.deepEqual(data.groups[2].artists.map(artist => artist.name), ["Past peak", "Past second"]);
  const displayed = data.groups.flatMap(group => group.artists);
  assert.equal(new Set(displayed.map(artist => artist.key)).size, displayed.length);
  assert.equal(data.recentSeasons, 8);
  const expanded = aggregateArtistHistory([...fixture(), ...Array.from({ length: 12 }, (_, index) => plays(100, `Past extra ${index}`, `${2000 + index}-01-15T12:00:00Z`)).flat()], now);
  assert.deepEqual(expanded.groups.map(group => group.artists.length), [5, 2, 10]);
  assert.deepEqual(expanded.groups[2].artists.slice(0, 2).map(artist => artist.name), ["Past peak", "Past second"]);
  const aged = aggregateArtistHistory(fixture(), new Date("2029-11-27T15:00:00Z"));
  assert.equal(aged.groups[1].artists.length, 0);
});

test("season boundaries use Eastern dates, include December in the following winter, and omit future seasons", () => {
  const dates = ["2025-12-01T04:59:59Z", "2025-12-01T05:00:00Z", "2026-03-01T04:59:59Z", "2026-03-01T05:00:00Z"];
  const data = aggregateArtistHistory(dates.flatMap(date => plays(1, "Boundary", date)), new Date("2026-03-15T12:00:00Z"));
  assert.equal(data.buckets.find(bucket => bucket.label === "Autumn 2025")?.plays, 1);
  assert.equal(data.buckets.find(bucket => bucket.label === "Winter 2026")?.plays, 2);
  assert.equal(data.buckets.find(bucket => bucket.label === "Spring 2026")?.plays, 1);
  assert.equal(data.buckets.at(-1)?.label, "Spring 2026");
  assert.equal(data.buckets.some(bucket => bucket.label === "Summer 2026"), false);
  assert.equal(data.groups[0].artists[0].seasonPlays.reduce((sum, count) => sum + count, 0), 4);
});

test("artist history uses the public exclusions, preserves empty archive seasons, and exposes no event data", () => {
  const valid = fixture(), privateListen = { ...plays(1, "Private", "2026-11-26T12:00:00Z")[0], privateSession: true };
  const disney = plays(1, "Disney music", "2026-11-26T12:00:00Z")[0]; disney.track.album = "Frozen";
  const podcast = { ...plays(1, "Podcast", "2026-11-26T12:00:00Z")[0], media: "podcast" as const };
  const rows = [...valid, privateListen, disney, podcast, ...plays(1, "Kids", "2026-11-26T12:00:00Z", ["kids music"]), ...plays(1, "Future", "2026-11-28T12:00:00Z")];
  const before = JSON.stringify(rows), data = aggregateArtistHistory(rows, now);
  assert.equal(data.buckets.reduce((sum, bucket) => sum + bucket.plays, 0), aggregateMusic(rows, now).datasets["all/all"].stats.plays);
  assert.ok(data.buckets.some(bucket => bucket.plays === 0));
  assert.ok(data.groups.flatMap(group => group.artists).every(artist => artist.seasonPlays.length === data.buckets.length));
  for (const value of ["PRIVATE-ORIGINAL", "rawRef", "playedAt", "msPlayed", "Private", "Kids", "Disney music", "Podcast", "Future"]) assert.equal(JSON.stringify(data).includes(value), false);
  assert.equal(JSON.stringify(rows), before);
  const duplicatedCredit = plays(1, "Credit", "2026-11-26T12:00:00Z"); duplicatedCredit[0].track.artists = ["Same", "same"];
  assert.equal(aggregateArtistHistory(duplicatedCredit, now).groups[0].artists[0].plays, 1);
  const empty = aggregateArtistHistory([], now);
  assert.equal(empty.startYear, null); assert.deepEqual(empty.buckets, []); assert.ok(empty.groups.every(group => !group.artists.length));
});

test("publication and period changes retain one all-time artist history and its hover metadata", async () => {
  const privateStore = memory(), publicStore = memory();
  await saveListens(privateStore, fixture());
  const { manifest } = await publishMusic(privateStore, publicStore, now);
  assert.match(manifest.files["artist-history"], /^datasets\/[a-f0-9]{24}\.json$/);
  const history = (await readJson<MusicArtistHistoryDataset>(publicStore, manifest.files["artist-history"]))!;
  const entities = (await readJson<MusicEntityDataset>(publicStore, manifest.files.entities))!;
  for (const artist of history.groups.flatMap(group => group.artists)) assert.equal(entities.entities[musicEntityKey("artist", artist.name)].plays, artist.plays);
  const calls: string[] = [], cache = new Map<string, unknown>();
  const reader: MusicJsonReader = async <T,>(file: string) => { calls.push(file); return await readJson<T>(publicStore, file) as T; };
  const signal = new AbortController().signal;
  const recent = await readMusicCollection(reader, "30d", signal, cache);
  const all = await readMusicCollection(reader, "all", signal, cache);
  assert.equal(recent.artistHistory, all.artistHistory);
  assert.equal(calls.filter(file => file === manifest.files["artist-history"]).length, 1);
  const legacy = await readMusicCollection(reader, "30d", signal, new Map(), { ...manifest, files: Object.fromEntries(Object.entries(manifest.files).filter(([key]) => key !== "artist-history")) });
  assert.equal(legacy.artistHistory, null);
});
