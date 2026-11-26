import { strict as assert } from "node:assert";
import { test } from "node:test";
import { nearestChartIndex, nearestChartSeries } from "../src/lib/music/chart-interaction.ts";

test("chart inspection clamps to available periods and works with a single point", () => {
  assert.equal(nearestChartIndex(-.2, 40), 0);
  assert.equal(nearestChartIndex(1.2, 40), 39);
  assert.equal(nearestChartIndex(.5, 9), 4);
  assert.equal(nearestChartIndex(.8, 1), 0);
});

test("seasonal hit testing retains overlapping series and ignores distant points and zero-only gaps", () => {
  const series = Array.from({ length: 40 }, (_, i) => ({ key: `artist-${i}`, plays: [i < 3 ? 4 : 12, 0] }));
  assert.deepEqual(nearestChartSeries(series, 0, 4.1, .3).map(line => line.key), ["artist-0", "artist-1", "artist-2"]);
  assert.equal(nearestChartSeries(series, 0, 7, .3).length, 0);
  assert.equal(nearestChartSeries(series, 1, 0, .3).length, 0);
  assert.deepEqual(nearestChartSeries([], 0, 4, .3), []);
});
