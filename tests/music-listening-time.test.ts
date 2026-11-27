import { strict as assert } from "node:assert";
import { test } from "node:test";
import { aggregateMusic } from "../src/lib/music/aggregate.ts";
import { averageListeningTime, formatListeningTime, listeningTimeCalendar } from "../src/lib/music/listening-time.ts";
import { musicTrack, spotifyListen } from "../src/lib/music/normalize.ts";
import type { Listen } from "../src/lib/music/types.ts";

const now = new Date("2026-11-02T17:00:00Z");
const timezone = "America/New_York";
const listen = (id: string, playedAt: string, msPlayed: number | null): Listen => ({ ...spotifyListen({ played_at: playedAt, track: { name: "Song", duration_ms: 9999999, artists: [{ name: "Artist" }] } }, "private/source")!, id, msPlayed });

test("weekday and hourly time averages include quiet calendar days, not just days with plays", () => {
  const rows = [listen("last-monday", "2026-10-26T16:00:00Z", 600000), listen("this-monday", "2026-11-02T17:00:00Z", 600000)];
  const before = JSON.stringify(rows), { datasets } = aggregateMusic(rows, now);
  const recent = datasets["all/30d"];
  assert.equal(JSON.stringify(rows), before);
  assert.equal(recent.stats.listeningTime!.days, 31);
  assert.deepEqual(recent.stats.listeningTime!.weekdayDays, [5, 4, 4, 4, 4, 5, 5]);
  assert.equal(averageListeningTime(recent, "weekday", 0).average, 1200000 / 5);
  assert.equal(averageListeningTime(recent, "hour", 12).average, 1200000 / 31);
  assert.equal(averageListeningTime(recent, "weekday", 4).average, 0);
  assert.equal(datasets["all/all"].stats.listeningTime!.days, 8);
  assert.equal(averageListeningTime(datasets["all/all"], "weekday", 0).average, 600000);
  assert.equal(averageListeningTime(datasets["all/2026"], "weekday", 0).days, 44);
  assert.equal(recent.stats.listeningTime!.weekdaysMsPlayed.reduce((a, b) => a + b, 0), recent.stats.msPlayed);
  assert.equal(recent.stats.listeningTime!.hoursMsPlayed.reduce((a, b) => a + b, 0), recent.stats.msPlayed);
});

test("Eastern hour bins combine repeated DST hours and retain public exclusions and exact rolling cutoffs", () => {
  const good = [listen("first-0130", "2026-11-01T05:30:00Z", 60000), listen("second-0130", "2026-11-01T06:30:00Z", 120000)];
  const excluded = [
    { ...listen("kids", "2026-11-01T05:30:00Z", 900000), track: musicTrack("Kids", ["Artist"], { genres: ["kids music"] }) },
    { ...listen("private", "2026-11-01T05:30:00Z", 900000), privateSession: true },
    listen("before-window", "2026-10-03T16:59:59Z", 900000),
    listen("future", "2026-11-02T17:00:01Z", 900000),
  ];
  const recent = aggregateMusic([...good, ...excluded], now).datasets["all/30d"];
  assert.equal(recent.stats.listeningTime!.hoursMsPlayed[1], 180000);
  assert.equal(averageListeningTime(recent, "hour", 1).average, 180000 / 31);
  assert.equal(averageListeningTime(recent, "weekday", 6).average, 180000 / 5);
  assert.equal(recent.stats.msPlayed, 180000);
  assert.equal(recent.stats.plays, 2);
});

test("missing durations stay unavailable, partial measurements are retained, and zero duration is measured", () => {
  const rows = [listen("known", "2026-11-02T17:00:00Z", 60000), listen("unknown-same-hour", "2026-10-26T16:00:00Z", null), listen("unknown-sunday", "2026-11-01T07:00:00Z", null)];
  const recent = aggregateMusic(rows, now).datasets["all/30d"];
  assert.deepEqual(averageListeningTime(recent, "hour", 12), { average: 60000 / 31, msPlayed: 60000, durationKnown: 1, plays: 2, days: 31 });
  assert.equal(averageListeningTime(recent, "weekday", 6).average, null);
  assert.equal(averageListeningTime(recent, "hour", 2).average, null);
  const unknown = aggregateMusic([rows[1]], now).datasets["all/30d"];
  assert.equal(averageListeningTime(unknown, "hour", 12).average, null);
  assert.equal(averageListeningTime(unknown, "hour", 8).average, null);
  const zero = aggregateMusic([listen("zero", now.toISOString(), 0)], now).datasets["all/30d"];
  assert.equal(averageListeningTime(zero, "hour", 12).average, 0);
  const legacy = { ...recent, stats: { ...recent.stats, listeningTime: undefined } };
  assert.equal(averageListeningTime(legacy, "hour", 12).average, null);
  assert.equal(averageListeningTime(aggregateMusic([], now).datasets["all/all"], "weekday", 0).average, null);
});

test("calendar denominators cover full historical years and stop current years at the collection date", () => {
  const leapYear = listeningTimeCalendar("2024", now, "2024-11-30", timezone);
  assert.equal(leapYear.startDate, "2024-01-01");
  assert.equal(leapYear.endDate, "2024-12-31");
  assert.equal(leapYear.days, 366);
  assert.equal(leapYear.weekdayDays.reduce((a, b) => a + b, 0), 366);
  const current = listeningTimeCalendar("2026", now, "2026-06-01", timezone);
  assert.equal(current.endDate, "2026-11-02");
  assert.equal(current.days, 306);
  const spring = listeningTimeCalendar("30d", new Date("2026-03-15T16:00:00Z"), null, timezone);
  assert.equal(spring.days, 31);
  assert.equal(new Set([spring.startDate, spring.endDate]).size, 2);
});

test("duration labels show zero below a minute and preserve unknown, minute, and hour values", () => {
  assert.equal(formatListeningTime(null), "Unavailable");
  assert.equal(formatListeningTime(0), "0");
  assert.equal(formatListeningTime(500), "0");
  assert.equal(formatListeningTime(30000), "0");
  assert.equal(formatListeningTime(59999), "0");
  assert.equal(formatListeningTime(60000), "1 min");
  assert.equal(formatListeningTime(90000), "1.5 min");
  assert.equal(formatListeningTime(3660000), "1 hr 1 min");
});
