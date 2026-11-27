import { strict as assert } from "node:assert";
import { test } from "node:test";
import { aggregateSoundtrackSongs, aggregateSoundtrack } from "../src/lib/music/soundtrack.ts";
import { aggregateMusic } from "../src/lib/music/aggregate.ts";
import { musicEntityKey } from "../src/lib/music/entity-links.ts";
import { musicTrack, spotifyListen } from "../src/lib/music/normalize.ts";
import type { Listen } from "../src/lib/music/types.ts";

const now = new Date("2026-11-26T20:00:00Z");
function plays(count: number, name: string, date: string, genre = name): Listen[] {
  return Array.from({ length: count }, (_, i) => ({
    ...spotifyListen({ ts: date, master_metadata_track_name: name, master_metadata_album_artist_name: name, ms_played: 60000 }, "PRIVATE-ORIGINAL")!,
    id: name + date + i, track: musicTrack(name, [name], { album: name, genres: [genre] }),
  }));
}

test("the sticky periods select daily, monthly, and yearly buckets with continuous empty gaps", () => {
  const rows = [...plays(11, "Main", "2024-01-15T12:00:00Z"), ...plays(11, "Main", "2026-10-28T12:00:00Z"), ...plays(11, "Main", "2026-11-26T12:00:00Z")];
  const data = aggregateSoundtrack(rows, now);
  assert.equal(data["all/soundtrack/30d"].granularity, "day");
  assert.equal(data["all/soundtrack/30d"].buckets.length, 31);
  assert.equal(data["all/soundtrack/30d"].buckets[0].key, "2026-10-27");
  assert.equal(data["all/soundtrack/30d"].buckets.at(-1)!.key, "2026-11-26");
  assert.equal(data["all/soundtrack/365d"].granularity, "month");
  assert.equal(data["all/soundtrack/365d"].buckets.length, 13);
  assert.equal(data["all/soundtrack/365d"].buckets[0].key, "2025-11");
  assert.equal(data["all/soundtrack/2024"].granularity, "month");
  assert.deepEqual(data["all/soundtrack/2024"].buckets.map(b => b.key), Array.from({ length: 12 }, (_, i) => `2024-${String(i + 1).padStart(2, "0")}`));
  assert.equal(data["all/soundtrack/all"].granularity, "year");
  assert.deepEqual(data["all/soundtrack/all"].buckets.map(b => b.key), ["2024", "2025", "2026"]);
  assert.deepEqual(data["all/soundtrack/all"].metrics.artists.series[0].plays, [11, 0, 22]);
});

test("rolling cutoffs and Eastern calendar boundaries match history totals exactly", () => {
  const dates = ["2025-11-26T19:59:59Z", "2025-11-26T20:00:00Z", "2026-10-27T19:59:59Z", "2026-10-27T20:00:00Z", "2026-11-26T20:00:00Z", "2026-11-26T20:00:01Z", "2025-01-01T04:59:59Z", "2025-01-01T05:00:00Z"];
  const rows = dates.flatMap(date => plays(11, "Main", date));
  const soundtrack = aggregateSoundtrack(rows, now), history = aggregateMusic(rows, now);
  for (const [key, data] of Object.entries(soundtrack)) {
    const counterpart = history.datasets[key.replace("/soundtrack", "")];
    assert.equal(data.metrics.artists.classifiedPlays, counterpart.stats.plays, key);
    assert.equal(data.metrics.artists.series[0]?.plays.reduce((a, b) => a + b, 0) || 0, counterpart.stats.plays, key);
  }
  assert.equal(soundtrack["all/soundtrack/2024"].metrics.artists.series[0].plays[11], 11);
  assert.equal(soundtrack["all/soundtrack/2025"].metrics.artists.series[0].plays[0], 11);
  const songs = aggregateSoundtrackSongs(rows, soundtrack, now);
  assert.equal(songs["all/soundtrack/30d"].artists.main[0].plays, 22);
  assert.equal(songs["all/soundtrack/365d"].artists.main[0].plays, 44);
});

test("daily buckets remain continuous over DST and honor a custom timezone", () => {
  for (const [end, expected] of [["2026-03-15T12:00:00Z", ["2026-03-07", "2026-03-08", "2026-03-09"]], ["2026-11-15T12:00:00Z", ["2026-10-31", "2026-11-01", "2026-11-02"]]] as const) {
    const data = aggregateSoundtrack(plays(11, "Main", end), new Date(end))["all/soundtrack/30d"];
    assert.equal(data.buckets.length, 31);
    for (const date of expected) assert.equal(data.buckets.filter(b => b.key === date).length, 1);
  }
  const rows = plays(11, "Main", "2025-01-01T01:00:00Z");
  assert.ok(aggregateSoundtrack(rows, now)["all/soundtrack/2024"]);
  assert.ok(aggregateSoundtrack(rows, now, "UTC")["all/soundtrack/2025"]);
});

test("bucket cutoffs and top-five selection are independent at every granularity with deterministic ties", () => {
  const rows = [...plays(6, "Steady", "2025-03-15T12:00:00Z"), ...plays(6, "Steady", "2025-06-15T12:00:00Z"), ...plays(10, "Low", "2025-06-15T12:00:00Z")];
  for (let month = 3; month <= 6; month += 3) for (let i = 0; i < 6; i++) rows.push(...plays(11, `Leader ${month} ${i}`, `2025-${String(month).padStart(2, "0")}-15T12:00:00Z`));
  const before = JSON.stringify(rows), data = aggregateSoundtrack(rows, now);
  for (const metric of ["genres", "artists", "albums"] as const) {
    const monthly = data["all/soundtrack/2025"].metrics[metric].series;
    assert.equal(monthly.length, 10);
    assert.equal(monthly.some(s => s.name.toLowerCase() === "steady" || s.name.toLowerCase() === "low" || s.name.endsWith(" 5")), false);
    const annual = data["all/soundtrack/all"].metrics[metric].series;
    assert.equal(annual.length, 5);
    assert.deepEqual(annual.find(s => s.name.toLowerCase() === "steady")!.plays, [12]);
  }
  assert.equal(aggregateMusic(rows, now).datasets["all/all"].stats.plays, rows.length);
  assert.equal(JSON.stringify(rows), before);
});

test("last 30 days includes single plays and quiet buckets while retaining daily top-five selection", () => {
  const rows = [...plays(1, "Solo", "2026-11-20T12:00:00Z"), ...plays(10, "Quiet", "2026-11-20T12:00:00Z"), ...plays(1, "Solo", "2026-11-21T12:00:00Z")];
  for (let i = 0; i < 6; i++) rows.push(...plays(1, `Leader ${i}`, "2026-11-21T12:00:00Z"));
  const data = aggregateSoundtrack(rows, now);
  for (const platform of ["all", "spotify"]) {
    const daily = data[`${platform}/soundtrack/30d`];
    assert.equal(daily.minimumPlays, 1);
    const first = daily.buckets.findIndex(bucket => bucket.key === "2026-11-20");
    const second = daily.buckets.findIndex(bucket => bucket.key === "2026-11-21");
    for (const metric of ["genres", "artists", "albums"] as const) {
      const series = daily.metrics[metric].series;
      assert.deepEqual(series.map(line => line.name.toLowerCase()).sort(), ["leader 0", "leader 1", "leader 2", "leader 3", "leader 4", "quiet", "solo"]);
      const solo = series.find(line => line.name.toLowerCase() === "solo")!;
      assert.equal(solo.plays[first], 1);
      assert.equal(solo.plays[second], 1);
      assert.equal(series.find(line => line.name.toLowerCase() === "quiet")!.plays[first], 10);
      for (const period of ["365d", "2026", "all"]) {
        const other = data[`${platform}/soundtrack/${period}`];
        assert.equal(other.minimumPlays, 11);
        assert.deepEqual(other.metrics[metric].series, []);
      }
    }
  }
  const songs = aggregateSoundtrackSongs(rows, data, now);
  assert.equal(songs["all/soundtrack/30d"].artists.solo[0].plays, 2);
  assert.equal(songs["all/soundtrack/30d"].artists.quiet[0].plays, 10);
});

test("song drilldowns stay within the selected range and retain quiet buckets, guest credits, and platforms", () => {
  const credited = (count: number, title: string, date: string, artists = ["Artist"], albumArtists = ["Artist"]) => plays(count, title, date, "indie").map(row => ({ ...row, track: musicTrack(title, artists, { album: "Shared title", albumArtists, genres: ["indie", "INDIE", " indie "] }) }));
  const rows = [...credited(11, "Main", "2026-11-20T12:00:00Z"), ...credited(1, "Guest", "2026-11-21T12:00:00Z", ["Artist", "Guest", "ARTIST"]), ...credited(1, "Quiet", "2026-10-28T12:00:00Z"), ...credited(11, "Old", "2024-11-20T12:00:00Z"), ...credited(11, "Unrelated", "2026-11-20T12:00:00Z", ["Other"], ["Other"])];
  rows.push({ ...credited(1, "Quiet", "2026-10-28T12:00:00Z")[0], id: "google", platform: "google-play-music" });
  const before = JSON.stringify(rows), data = aggregateSoundtrack(rows, now), songs = aggregateSoundtrackSongs(rows, data, now);
  const album = musicEntityKey("album", "Shared title", ["Artist"]);
  for (const [metric, key] of [["genres", "indie"], ["artists", "artist"], ["albums", album]] as const) {
    const selected = songs["all/soundtrack/30d"][metric][key];
    assert.equal(selected.find(s => s.key === musicEntityKey("track", "Guest", ["Artist", "Guest"]))!.plays, 1);
    assert.equal(selected.find(s => s.key === musicEntityKey("track", "Quiet", ["Artist"]))!.buckets["2026-10-28"], 2);
    assert.equal(selected.some(s => s.key === musicEntityKey("track", "Old", ["Artist"])), false);
  }
  assert.equal(songs["all/soundtrack/30d"].artists.artist.reduce((sum, s) => sum + s.plays, 0), 14);
  assert.equal(songs["spotify/soundtrack/30d"].artists.artist.reduce((sum, s) => sum + s.plays, 0), 13);
  assert.equal(data["all/soundtrack/30d"].metrics.genres.classifiedPlays, rows.length - 11);
  assert.equal(JSON.stringify(rows), before);
});

test("every range and song list applies public exclusions without exposing private source records", () => {
  const rows = [...plays(11, "Approved", "2026-11-20T12:00:00Z"), ...plays(11, "Kids", "2026-11-20T12:00:00Z", "kids music"), ...plays(11, "Private", "2026-11-20T12:00:00Z").map(row => ({ ...row, privateSession: true })), ...plays(11, "Future", "2030-03-15T12:00:00Z"), ...plays(11, "Disney", "2026-11-20T12:00:00Z")];
  const data = aggregateSoundtrack(rows, now);
  for (const dataset of Object.values(data)) assert.deepEqual(dataset.metrics.artists.series.map(line => line.name), ["Approved"]);
  const publicData = JSON.stringify([data, aggregateSoundtrackSongs(rows, data, now)]);
  for (const excluded of ["Kids", "Private", "Future", "Disney", "PRIVATE-ORIGINAL"]) assert.equal(publicData.includes(excluded), false);
  for (const dataset of Object.values(aggregateSoundtrack([], now))) { assert.deepEqual(dataset.buckets, []); assert.deepEqual(dataset.metrics.artists.series, []); }
});
