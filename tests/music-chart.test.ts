import { strict as assert } from "node:assert";
import { test } from "node:test";
import { chartPointAt, morphMusicLine, nearestChartIndex, nearestChartSeries } from "../src/lib/music/chart-interaction.ts";

test("chart inspection clamps to available periods and works with a single point", () => {
  assert.equal(nearestChartIndex(-.2, 40), 0);
  assert.equal(nearestChartIndex(1.2, 40), 39);
  assert.equal(nearestChartIndex(.5, 9), 4);
  assert.equal(nearestChartIndex(.8, 1), 0);
});

test("soundtrack hit testing retains overlapping series and ignores distant points and zero-only gaps", () => {
  const series = Array.from({ length: 40 }, (_, i) => ({ key: `artist-${i}`, plays: [i < 3 ? 4 : 12, 0] }));
  assert.deepEqual(nearestChartSeries(series, 0, 4.1, .3).map(line => line.key), ["artist-0", "artist-1", "artist-2"]);
  assert.equal(nearestChartSeries(series, 0, 7, .3).length, 0);
  assert.equal(nearestChartSeries(series, 1, 0, .3).length, 0);
  assert.deepEqual(nearestChartSeries([], 0, 4, .3), []);
});

test("line transitions preserve peaks and both endpoints when a period adds or removes months", () => {
  const all = [{ t: 1, x: 12, y: 120 }, { t: 2, x: 300, y: 24 }, { t: 3, x: 588, y: 100 }];
  const recent = [{ t: 3, x: 300, y: 24 }];
  assert.equal(morphMusicLine(all, recent, 0), all);
  assert.equal(morphMusicLine(all, recent, 1), recent);
  assert.deepEqual(morphMusicLine(all, recent, .5), [{ t: 1, x: 156, y: 72 }, { t: 2, x: 300, y: 24 }, { t: 3, x: 444, y: 62 }]);
  assert.deepEqual(morphMusicLine(recent, all, .5), morphMusicLine(all, recent, .5));
  assert.deepEqual(chartPointAt(all, 1.5), { t: 1.5, x: 156, y: 72 });
});

test("an interrupted transition starts at the visible geometry and finishes without stale vertices", () => {
  const from = [{ t: 1, x: 12, y: 166 }, { t: 4, x: 588, y: 24 }];
  const first = [{ t: 3, x: 12, y: 24 }, { t: 4, x: 588, y: 100 }];
  const next = [{ t: 4, x: 300, y: 24 }];
  const visible = morphMusicLine(from, first, .4);
  assert.equal(morphMusicLine(visible, next, 0), visible);
  assert.deepEqual(morphMusicLine(visible, next, .5).map(point => point.t), [1, 3, 4]);
  assert.equal(morphMusicLine(visible, next, 1), next);
  assert.deepEqual(chartPointAt(next, 2), { t: 2, x: 300, y: 24 });
  assert.deepEqual(chartPointAt(next, 8), { t: 8, x: 300, y: 24 });
});
