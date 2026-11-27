import { strict as assert } from "node:assert";
import { test } from "node:test";
import { aggregateGenreSongs, aggregateSeasons } from "../src/lib/music/seasons.ts";
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

test("the seasonal cutoff is strictly more than ten and only changes the soundtrack graph", () => {
  const rows = [...plays(10, "Low", "2025-03-15T12:00:00Z"), ...plays(11, "High", "2025-03-15T12:00:00Z"), ...plays(10, "High", "2025-06-15T12:00:00Z")];
  const original = JSON.stringify(rows);
  const data = aggregateSeasons(rows, now)["all/seasons"];
  assert.equal(data.minimumPlays, 11);
  for (const metric of ["genres", "artists", "albums"] as const) {
    assert.equal(data.metrics[metric].series.length, 1);
    assert.equal(data.metrics[metric].series[0].name.toLowerCase(), "high");
    assert.deepEqual(data.metrics[metric].series[0].plays, [11, 0]);
  }
  assert.equal(aggregateMusic(rows, now).datasets["all/all"].stats.plays, 31);
  assert.equal(JSON.stringify(rows), original);
});

test("genre song lists retain one-play songs and low-volume seasons independently of the chart cutoff", () => {
  const rows = [...plays(11, "Main", "2024-09-15T12:00:00Z", "indie"), ...plays(1, "One-off", "2024-09-16T12:00:00Z", "indie"), ...plays(1, "Quiet season", "2025-03-15T12:00:00Z", "indie")];
  rows[0].track.genres = ["indie", "INDIE", " indie "];
  rows.push({ ...plays(1, "Private", "2024-09-15T12:00:00Z", "indie")[0], privateSession: true });
  rows.push({ ...plays(1, "Kids", "2024-09-15T12:00:00Z", "indie")[0], track: musicTrack("Kids", ["Kids"], { genres: ["indie", "kids music"] }) });
  rows.push(...plays(1, "Disney", "2024-09-15T12:00:00Z", "indie"));
  rows.push(...plays(1, "Future", "2030-09-15T12:00:00Z", "indie"));
  const before = JSON.stringify(rows);
  const seasonal = aggregateSeasons(rows, now);
  assert.deepEqual(seasonal["all/seasons"].metrics.genres.series[0].plays, [12, 0, 0]);
  const songs = aggregateGenreSongs(rows, seasonal, now)["all/seasons"].indie;
  assert.equal(songs.reduce((sum, row) => sum + row.plays, 0), 13);
  const one = songs.find(row => row.key === musicEntityKey("track", "One-off", ["One-off"]))!;
  assert.equal(one.plays, 1); assert.equal(one.seasons["2024-fall"], 1);
  const quiet = songs.find(row => row.key === musicEntityKey("track", "Quiet season", ["Quiet season"]))!;
  assert.equal(quiet.plays, 1); assert.equal(quiet.seasons["2025-spring"], 1);
  assert.equal(songs.length, 3);
  assert.equal(JSON.stringify(rows), before);
});
