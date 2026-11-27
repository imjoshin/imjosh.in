import { strict as assert } from "node:assert";
import { test } from "node:test";
import { aggregateMusic } from "../src/lib/music/aggregate.ts";
import { spotifyListen, musicTrack } from "../src/lib/music/normalize.ts";
import type { Listen } from "../src/lib/music/types.ts";

const now = new Date("2026-11-02T17:00:00Z");
const listen = (id: string, playedAt: string, msPlayed: number | null = 60000): Listen => ({ ...spotifyListen({ played_at: playedAt, track: { name: "Song", artists: [{ name: "Artist" }] } }, "private/source")!, id, msPlayed });

test("daily 30-day totals use Eastern dates across midnight and DST, retain quiet days, and match filtered totals", () => {
  const kids = { ...listen("kids", "2026-11-01T12:00:00Z"), track: musicTrack("Kids", ["Kids artist"], { genres: ["kids music"] }) };
  const rows = [
    listen("before-window", "2026-10-03T16:59:59Z"),
    listen("window-start", "2026-10-03T17:00:00Z", 120000),
    listen("before-midnight", "2026-11-01T03:59:59Z", null),
    listen("midnight", "2026-11-01T04:00:00Z", 30000),
    listen("first-0130", "2026-11-01T05:30:00Z", 60000),
    listen("second-0130", "2026-11-01T06:30:00Z", 90000),
    listen("window-end", now.toISOString(), 0),
    { ...listen("google", "2026-11-01T15:00:00Z"), platform: "google-play-music" as const, source: "takeout" as const },
    kids,
    { ...listen("private", "2026-11-01T12:00:00Z"), privateSession: true },
    { ...listen("disney", "2026-11-01T12:00:00Z"), track: musicTrack("Disney song", ["Disney"]) },
    listen("future", "2026-11-02T17:00:01Z"),
  ];
  const before = JSON.stringify(rows), result = aggregateMusic(rows, now);
  assert.equal(JSON.stringify(rows), before);
  const stats = result.datasets["all/30d"].stats, days = stats.days!;
  assert.equal(days.length, 31); // A rolling 30-day window intersects two partial boundary dates.
  assert.equal(new Set(days.map(day => day.date)).size, days.length);
  assert.deepEqual(days[0], { date: "2026-10-03", plays: 1, msPlayed: 120000 });
  assert.equal(days.at(-1)!.date, "2026-11-02");
  assert.deepEqual(days.find(day => day.date === "2026-10-30"), { date: "2026-10-30", plays: 0, msPlayed: 0 });
  assert.deepEqual(days.find(day => day.date === "2026-10-31"), { date: "2026-10-31", plays: 1, msPlayed: 0 });
  assert.deepEqual(days.find(day => day.date === "2026-11-01"), { date: "2026-11-01", plays: 4, msPlayed: 240000 });
  assert.equal(days.reduce((sum, day) => sum + day.plays, 0), stats.plays);
  assert.equal(days.reduce((sum, day) => sum + day.msPlayed, 0), stats.msPlayed);
  assert.equal(stats.plays, 7);
  assert.equal(result.datasets["spotify/30d"].stats.days!.find(day => day.date === "2026-11-01")!.plays, 3);
  assert.equal(result.datasets["google-play-music/30d"].stats.days!.reduce((sum, day) => sum + day.plays, 0), 1);
  assert.equal(result.datasets["all/all"].stats.days, undefined);
  assert.equal(result.datasets["all/365d"].stats.days, undefined);
  assert.equal(result.datasets["all/2026"].stats.days, undefined);
});

test("an empty recent history has no invented daily observations", () => {
  const result = aggregateMusic([listen("old", "2026-01-01T12:00:00Z")], now);
  assert.deepEqual(result.datasets["all/30d"].stats.days, []);
  assert.equal(result.datasets["all/30d"].stats.plays, 0);
});
