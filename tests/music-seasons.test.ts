import { strict as assert } from "node:assert";
import { test } from "node:test";
import { aggregateSeasonSongs, aggregateSeasons } from "../src/lib/music/seasons.ts";
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
  const songs = aggregateSeasonSongs(rows, seasonal, now)["all/seasons"].genres.indie;
  assert.equal(songs.reduce((sum, row) => sum + row.plays, 0), 13);
  const one = songs.find(row => row.key === musicEntityKey("track", "One-off", ["One-off"]))!;
  assert.equal(one.plays, 1); assert.equal(one.seasons["2024-fall"], 1);
  const quiet = songs.find(row => row.key === musicEntityKey("track", "Quiet season", ["Quiet season"]))!;
  assert.equal(quiet.plays, 1); assert.equal(quiet.seasons["2025-spring"], 1);
  assert.equal(songs.length, 3);
  assert.equal(JSON.stringify(rows), before);
});

test("artist and album song lists preserve quiet seasons, guest credits, and platform attribution", () => {
  const credited = (count: number, title: string, date: string, artists = ["Artist"], album = "Shared title", albumArtists = ["Artist"]) => plays(count, title, date, "indie").map(row => ({ ...row, track: musicTrack(title, artists, { album, albumArtists, genres: ["indie"] }) }));
  const rows = [
    ...credited(11, "Main", "2024-09-15T12:00:00Z"),
    ...credited(1, "Guest song", "2024-09-16T12:00:00Z", ["Artist", "Guest", "ARTIST"]),
    ...credited(1, "Quiet", "2025-03-15T12:00:00Z"),
    ...credited(1, "Other album", "2024-09-16T12:00:00Z", ["Artist"], "Other album"),
    ...credited(12, "Unrelated", "2024-09-16T12:00:00Z", ["Other artist"], "Shared title", ["Other artist"]),
  ];
  rows.push({ ...credited(1, "Quiet", "2025-03-16T12:00:00Z")[0], id: "google-quiet", platform: "google-play-music" });
  rows.push({ ...credited(1, "Private", "2024-09-16T12:00:00Z")[0], privateSession: true });
  rows.push({ ...credited(1, "Kids", "2024-09-16T12:00:00Z")[0], track: musicTrack("Kids", ["Artist"], { album: "Shared title", albumArtists: ["Artist"], genres: ["kids music"] }) });
  rows.push(...credited(1, "Disney", "2024-09-16T12:00:00Z"));
  const before = JSON.stringify(rows);
  const seasonal = aggregateSeasons(rows, now);
  const songs = aggregateSeasonSongs(rows, seasonal, now);
  const albumKey = musicEntityKey("album", "Shared title", ["Artist"]);
  const otherAlbumKey = musicEntityKey("album", "Shared title", ["Other artist"]);
  const sum = (items: { plays: number }[]) => items.reduce((sum, song) => sum + song.plays, 0);
  assert.deepEqual(seasonal["all/seasons"].metrics.artists.series.find(line => line.key === "artist")!.plays, [13, 0, 0]);
  assert.deepEqual(seasonal["all/seasons"].metrics.albums.series.find(line => line.key === albumKey)!.plays, [12, 0, 0]);
  assert.equal(sum(songs["all/seasons"].artists.artist), 15);
  assert.equal(sum(songs["spotify/seasons"].artists.artist), 14);
  assert.equal(sum(songs["all/seasons"].albums[albumKey]), 14);
  assert.equal(sum(songs["spotify/seasons"].albums[albumKey]), 13);
  assert.equal(sum(songs["all/seasons"].albums[otherAlbumKey]), 12);
  const guestKey = musicEntityKey("track", "Guest song", ["Artist", "Guest"]);
  assert.equal(songs["all/seasons"].artists.artist.find(song => song.key === guestKey)!.plays, 1);
  assert.equal(songs["all/seasons"].albums[albumKey].find(song => song.key === guestKey)!.plays, 1);
  const quietKey = musicEntityKey("track", "Quiet", ["Artist"]);
  assert.equal(songs["all/seasons"].albums[albumKey].find(song => song.key === quietKey)!.seasons["2025-spring"], 2);
  assert.equal(songs["all/seasons"].artists.artist.length, 4);
  assert.equal(songs["all/seasons"].albums[albumKey].length, 3);
  assert.equal(JSON.stringify(rows), before);
});

test("year totals include quiet seasons and rank their own top five without changing seasonal results", () => {
  const rows = [
    ...plays(6, "Steady", "2025-03-15T12:00:00Z"), ...plays(6, "Steady", "2025-06-15T12:00:00Z"),
    ...Array.from({ length: 6 }, (_, i) => plays(11, `Leader ${i}`, "2025-09-15T12:00:00Z")).flat(),
    ...plays(10, "Below cutoff", "2025-09-15T12:00:00Z"),
  ];
  const before = JSON.stringify(rows);
  const data = aggregateSeasons(rows, now)["all/seasons"];
  assert.deepEqual(data.annual!.years, [{ key: "2025", label: "2025" }]);
  for (const metric of ["genres", "artists", "albums"] as const) {
    assert.equal(data.metrics[metric].series.some(line => line.name.toLowerCase() === "steady"), false);
    assert.deepEqual(data.annual!.metrics[metric].series.map(line => line.name.toLowerCase()).sort(), ["leader 0", "leader 1", "leader 2", "leader 3", "steady"]);
    assert.deepEqual(data.annual!.metrics[metric].series.find(line => line.name.toLowerCase() === "steady")!.plays, [12]);
  }
  const songs = aggregateSeasonSongs(rows, { "all/seasons": data }, now)["all/seasons"].artists.steady;
  assert.equal(songs[0].plays, 12);
  assert.deepEqual(songs[0].years, { "2025": 12 });
  assert.deepEqual(songs[0].seasons, { "2025-spring": 6, "2025-summer": 6 });
  assert.equal(JSON.stringify(rows), before);
});

test("calendar years use Eastern time independently of winter labels, retaining empty years and platform totals", () => {
  const rows = [
    ...plays(11, "Boundary", "2024-12-15T12:00:00Z"),
    ...plays(1, "Boundary", "2025-01-01T04:59:59Z"),
    ...plays(11, "Boundary", "2025-01-01T05:00:00Z"),
    ...plays(11, "Boundary", "2026-11-15T12:00:00Z").map(row => ({ ...row, platform: "google-play-music" as const })),
  ];
  const data = aggregateSeasons(rows, now);
  assert.deepEqual(data["all/seasons"].annual!.years.map(year => year.key), ["2024", "2025", "2026"]);
  assert.deepEqual(data["all/seasons"].annual!.metrics.artists.series[0].plays, [12, 11, 11]);
  assert.equal(data["all/seasons"].metrics.artists.series[0].plays[0], 23);
  assert.deepEqual(data["spotify/seasons"].annual!.metrics.artists.series[0].plays, [12, 11]);
  const gap = aggregateSeasons(rows.filter(row => Date.parse(row.playedAt) !== Date.parse("2025-01-01T05:00:00Z")), now)["all/seasons"];
  assert.deepEqual(gap.annual!.metrics.artists.series[0].plays, [12, 0, 11]);
  const songs = aggregateSeasonSongs(rows, data, now)["all/seasons"].artists.boundary[0];
  assert.deepEqual(songs.years, { "2024": 12, "2025": 11, "2026": 11 });
});

test("annual charts and song counts apply the same public exclusions as seasonal charts", () => {
  const rows = [
    ...plays(11, "Approved", "2025-03-15T12:00:00Z"),
    ...plays(11, "Kids", "2025-03-15T12:00:00Z", "kids music"),
    ...plays(11, "Private", "2025-03-15T12:00:00Z").map(row => ({ ...row, privateSession: true })),
    ...plays(11, "Future", "2030-03-15T12:00:00Z"),
    ...plays(11, "Disney", "2025-03-15T12:00:00Z"),
  ];
  const data = aggregateSeasons(rows, now);
  assert.deepEqual(data["all/seasons"].annual!.metrics.artists.series.map(line => line.name), ["Approved"]);
  const publicData = JSON.stringify([data, aggregateSeasonSongs(rows, data, now)]);
  for (const excluded of ["Kids", "Private", "Future", "Disney", "PRIVATE-ORIGINAL"]) assert.equal(publicData.includes(excluded), false);
  assert.deepEqual(aggregateSeasons([], now)["all/seasons"].annual!.years, []);
});
