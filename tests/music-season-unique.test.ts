import { strict as assert } from "node:assert";
import { test } from "node:test";
import { aggregateMusic } from "../src/lib/music/aggregate.ts";
import { musicTrack, spotifyListen } from "../src/lib/music/normalize.ts";
import { musicEntityKey } from "../src/lib/music/entity-links.ts";
import { publishMusic } from "../scripts/music/publish.ts";
import { readJson, saveListens, writeJson, type MusicStore } from "../scripts/music/store.ts";
import type { Listen, MusicDataset, MusicEntityDataset } from "../src/lib/music/types.ts";

const now = new Date("2026-11-27T15:00:00Z");
function plays(count: number, name: string, date: string, genres = ["indie pop"]): Listen[] {
  return Array.from({ length: count }, (_, index) => ({ ...spotifyListen({ ts: date, master_metadata_track_name: name, master_metadata_album_artist_name: name, ms_played: 60000 }, "PRIVATE-ORIGINAL")!, id: `${name}:${date}:${index}`, track: musicTrack(name, [name], { genres }) }));
}
const favorites = () => Array.from({ length: 5 }, (_, index) => plays(100 + index, `Lifetime ${index}`, "2020-01-15T12:00:00Z")).flat();
const seasonal = (rows: Listen[], period = "all", at = now) => aggregateMusic(rows, at).datasets[`all/${period}`].stats.seasonUnique!;

test("season unique removes the global lifetime five before filling each table, totals seasons across years, and allows repeat artists", () => {
  const rows = [...favorites(), ...plays(10, "Returning", "2025-04-01T12:00:00Z"), ...plays(11, "Returning", "2026-04-01T12:00:00Z"), ...plays(2, "Returning", "2026-07-01T12:00:00Z"),
    ...Array.from({ length: 8 }, (_, index) => plays(9 - index, `Spring ${index}`, "2026-04-01T12:00:00Z")).flat()];
  const before = JSON.stringify(rows), all = seasonal(rows);
  assert.deepEqual(all.map(s => s.season), ["winter", "spring", "summer", "autumn"]);
  assert.deepEqual(all[1].artists.map(a => [a.name, a.plays]), [["Returning", 21], ["Spring 0", 9], ["Spring 1", 8], ["Spring 2", 7], ["Spring 3", 6]]);
  assert.equal(all[2].artists[0].name, "Returning");
  assert.ok(all.every(s => s.artists.every(a => !a.name.startsWith("Lifetime"))));
  assert.ok(all.every(s => s.status === "ready"));
  assert.equal(seasonal(rows, "2025")[1].artists[0].plays, 10);
  assert.equal(JSON.stringify(rows), before);
  // Lifetime exclusion also applies in platform-specific datasets.
  assert.ok(aggregateMusic(rows, now).datasets["spotify/all"].stats.seasonUnique!.every(s => s.artists.every(a => !a.name.startsWith("Lifetime"))));
});

test("season years honor Eastern boundaries and assign December to the following winter", () => {
  const dates = ["2025-12-01T04:59:59Z", "2025-12-01T05:00:00Z", "2026-03-01T04:59:59Z", "2026-03-01T05:00:00Z", "2026-12-01T05:00:00Z"];
  const rows = [...favorites(), ...dates.flatMap(date => plays(1, "Boundary", date))];
  const data = seasonal(rows, "2026", new Date("2026-12-02T12:00:00Z"));
  assert.equal(data[0].artists[0].plays, 2);
  assert.equal(data[1].artists[0].plays, 1);
  assert.equal(data[3].artists.length, 0);
  assert.equal(seasonal(rows, "2025", new Date("2026-12-02T12:00:00Z"))[3].artists[0].plays, 1);
  assert.equal(seasonal(rows, "all", new Date("2026-12-02T12:00:00Z"))[0].artists[0].plays, 3);
});

test("current-year seasons enable only at their Eastern end boundary; short windows stay disabled", () => {
  const rows = [...favorites(), ...plays(1, "Current", "2026-01-02T12:00:00Z")];
  const boundaries = ["2026-03-01T05:00:00Z", "2026-06-01T04:00:00Z", "2026-09-01T04:00:00Z", "2026-12-01T05:00:00Z"];
  boundaries.forEach((end, index) => {
    const before = seasonal(rows, "2026", new Date(Date.parse(end) - 1));
    const after = seasonal(rows, "2026", new Date(end));
    assert.equal(before[index].status, "incomplete");
    assert.deepEqual(before[index].artists, []);
    assert.equal(after[index].status, "ready");
    assert.ok(after.slice(index + 1).every(s => s.status === "incomplete"));
  });
  assert.deepEqual(seasonal(rows, "30d").map(s => [s.status, s.artists.length]), Array(4).fill(["not_applicable", 0]));
  assert.deepEqual(seasonal(rows, "2026").map(s => s.status), ["ready", "ready", "ready", "incomplete"]);
});

test("rolling-year counts use exact timestamp cutoffs and all public exclusions, with unique collaboration credits", () => {
  const cutoff = new Date(now.getTime() - 365 * 86400000);
  const collaboration = plays(1, "Collaboration", "2026-04-02T12:00:00Z")[0]; collaboration.track.artists = ["One", "one", "Two"];
  const privateListen = { ...plays(1, "Private", "2026-04-02T12:00:00Z")[0], privateSession: true };
  const podcast = { ...plays(1, "Podcast", "2026-04-02T12:00:00Z")[0], media: "podcast" as const };
  const disney = plays(1, "Disney", "2026-04-02T12:00:00Z")[0]; disney.track.album = "Frozen";
  const rows = [...favorites(), ...plays(1, "Cutoff", new Date(cutoff.getTime() - 1).toISOString()), ...plays(1, "Cutoff", cutoff.toISOString()),
    collaboration, privateListen, podcast, disney, ...plays(1, "Kids", "2026-04-02T12:00:00Z", ["kids music"]), ...plays(1, "Future", "2026-11-28T12:00:00Z")];
  const seasons = seasonal(rows, "365d");
  assert.equal(seasons[3].artists.find(a => a.name === "Cutoff")?.plays, 1);
  assert.deepEqual(seasons[1].artists.map(a => a.plays), [1, 1]);
  for (const forbidden of ["PRIVATE-ORIGINAL", "rawRef", "playedAt", "msPlayed", "Private", "Podcast", "Disney", "Kids", "Future"]) assert.equal(JSON.stringify(seasons).includes(forbidden), false);
});

test("seasonal ties are deterministic and empty archives retain four honest empty tables", () => {
  const rows = [...favorites(), ...plays(1, "Zulu", "2026-04-02T12:00:00Z"), ...plays(1, "Alpha", "2026-04-02T12:00:00Z")];
  assert.deepEqual(seasonal(rows)[1].artists.map(a => a.name), ["Alpha", "Zulu"]);
  assert.deepEqual(seasonal([...rows].reverse()), seasonal(rows));
  assert.ok(seasonal([]).every(s => s.status === "ready" && s.artists.length === 0));
});

test("publication preserves seasonal leaders outside the general top 100 and supplies their hover metadata", async () => {
  const memory = (): MusicStore => {
    const values = new Map<string, Uint8Array>();
    return { async get(key) { return values.get(key) || null; }, async set(key, value) { values.set(key, value); }, async list(prefix) { return [...values.keys()].filter(key => key.startsWith(prefix)); } };
  };
  const privateStore = memory(), publicStore = memory();
  const rows = [...Array.from({ length: 101 }, (_, i) => plays(3, `Winter ${i}`, "2025-01-15T12:00:00Z")).flat(), ...plays(1, "Summer hidden", "2026-07-01T12:00:00Z")];
  await saveListens(privateStore, rows);
  await writeJson(privateStore, "catalog/spotify-tracks.json.gz", { summer: { name: "Summer hidden", artists: [{ name: "Summer hidden", id: "a".repeat(22), images: [{ url: "https://i.scdn.co/seasonal" }] }] } });
  const { manifest } = await publishMusic(privateStore, publicStore, now);
  const data = (await readJson<MusicDataset>(publicStore, manifest.files["all/all"]))!;
  const entities = (await readJson<MusicEntityDataset>(publicStore, manifest.files.entities))!;
  assert.equal(data.stats.topArtists.some(a => a.name === "Summer hidden"), false);
  const artist = data.stats.seasonUnique![2].artists[0];
  assert.equal(artist.name, "Summer hidden");
  assert.equal(artist.url, `https://open.spotify.com/artist/${"a".repeat(22)}`);
  assert.equal(artist.image, "https://i.scdn.co/seasonal");
  assert.equal(entities.entities[musicEntityKey("artist", artist.name)].plays, 1);
  const short = (await readJson<MusicDataset>(publicStore, manifest.files["all/30d"]))!;
  assert.ok(short.stats.seasonUnique!.every(s => s.status === "not_applicable" && !s.artists.length));
});
