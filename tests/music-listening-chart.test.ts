import { strict as assert } from "node:assert";
import { test } from "node:test";
import { aggregateMusic } from "../src/lib/music/aggregate.ts";
import { listeningChartBuckets } from "../src/lib/music/listening-chart.ts";

const empty = aggregateMusic([], new Date("2026-11-01T03:30:00Z")).datasets["all/all"];

test("monthly listening fills internal and boundary gaps without changing recorded totals", () => {
  const data = { ...empty, period: "2024", stats: { ...empty.stats, months: [{ month: "2024-02", plays: 3, msPlayed: 60000 }, { month: "2024-04", plays: 7, msPlayed: 120000 }] } };
  const before = JSON.stringify(data), buckets = listeningChartBuckets(data);
  assert.equal(buckets.length, 12);
  assert.deepEqual(buckets.slice(0, 4), [{ key: "2024-01", plays: 0 }, { key: "2024-02", plays: 3 }, { key: "2024-03", plays: 0 }, { key: "2024-04", plays: 7 }]);
  assert.deepEqual(buckets.at(-1), { key: "2024-12", plays: 0 });
  assert.equal(buckets.reduce((sum, bucket) => sum + bucket.plays, 0), 10);
  assert.equal(JSON.stringify(data), before);
});

test("empty monthly periods plot zeroes using the dataset's timezone and publication date", () => {
  const recent = listeningChartBuckets({ ...empty, period: "365d" });
  assert.equal(recent.length, 13);
  assert.deepEqual(recent[0], { key: "2025-10", plays: 0 });
  assert.deepEqual(recent.at(-1), { key: "2026-10", plays: 0 });
  assert.ok(recent.every(bucket => bucket.plays === 0));
  assert.equal(listeningChartBuckets({ ...empty, period: "2024" }).length, 12);
  assert.equal(listeningChartBuckets({ ...empty, period: "2026" }).length, 10);
  assert.deepEqual(listeningChartBuckets(empty), [{ key: "2026-10", plays: 0 }]);
});

test("all-time listening spans missing years and quiet months through publication", () => {
  const buckets = listeningChartBuckets({ ...empty, stats: { ...empty.stats, months: [{ month: "2024-12", plays: 5, msPlayed: 0 }] } });
  assert.equal(buckets.length, 23);
  assert.deepEqual(buckets[0], { key: "2024-12", plays: 5 });
  assert.ok(buckets.slice(1).every(bucket => bucket.plays === 0));
  assert.deepEqual(buckets.at(-1), { key: "2026-10", plays: 0 });
});

test("the 30-day chart retains daily observations and never substitutes monthly counts", () => {
  const data = { ...empty, period: "30d", stats: { ...empty.stats, days: [{ date: "2026-10-30", plays: 0, msPlayed: 0 }, { date: "2026-10-31", plays: 2, msPlayed: 60000 }] } };
  assert.deepEqual(listeningChartBuckets(data), [{ key: "2026-10-30", plays: 0 }, { key: "2026-10-31", plays: 2 }]);
  assert.deepEqual(listeningChartBuckets({ ...empty, period: "30d" }), []);
});
