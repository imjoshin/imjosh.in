import { strict as assert } from "node:assert";
import { test } from "node:test";
import { chartPointAt, morphMusicLine, musicLinePath, nearestChartIndex, nearestChartSeries } from "../src/lib/music/chart-interaction.ts";

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

test("smoothed lines pass through every observation without overshooting peaks, zeroes, or plateaus", () => {
  const points = [0, 30, 90, 15, 0, 0, 70, 72, 74, 0].map((y, i) => ({ t: i, x: i ** 2 + i, y }));
  const commands = musicLinePath(points).match(/[MLC][^MLC]*/g)!;
  assert.equal(commands.length, points.length);
  for (let i = 1; i < commands.length; i++) {
    assert.equal(commands[i][0], "C");
    const [x1, y1, x2, y2, x, y] = commands[i].slice(1).trim().split(/\s+/).map(Number);
    const a = points[i - 1], b = points[i];
    assert.deepEqual({ x, y }, { x: b.x, y: b.y });
    assert.ok(a.x <= x1 && x1 <= x2 && x2 <= b.x);
    const minimum = Math.min(a.y, b.y), maximum = Math.max(a.y, b.y);
    for (let sample = 0; sample <= 20; sample++) {
      const p = sample / 20, q = 1 - p;
      const value = q ** 3 * a.y + 3 * q ** 2 * p * y1 + 3 * q * p ** 2 * y2 + p ** 3 * b.y;
      assert.ok(value >= minimum - 1e-9 && value <= maximum + 1e-9);
    }
    if (i > 1) {
      const previous = commands[i - 1].slice(1).trim().split(/\s+/).map(Number);
      assert.ok(Math.abs((a.y - previous[3]) / (a.x - previous[2]) - (y1 - a.y) / (x1 - a.x)) < 1e-9);
    }
  }
});

test("smoothing never connects across soundtrack gaps and retains isolated observations", () => {
  const points = [20, 30, 25, 0, 40, 0, 50, 60].map((y, i) => ({ t: i, x: i * 10, y }));
  const paths = musicLinePath(points, point => point.y > 0).split(/(?=M)/).filter(Boolean);
  assert.equal(paths.length, 3);
  assert.ok(paths[0].includes("C"));
  assert.equal(paths[1].trim(), "M 40 40");
  assert.equal(paths[2].trim(), "M 60 50 L 70 60");
});

test("empty, single-point, two-point, and collapsed transition paths stay finite", () => {
  assert.equal(musicLinePath([]), "");
  const point = { t: 1, x: 12, y: 30 };
  assert.equal(musicLinePath([point]), "M 12 30");
  assert.equal(musicLinePath([point, { t: 2, x: 24, y: 60 }]), "M 12 30 L 24 60");
  const collapsed = musicLinePath([point, { ...point, t: 2, y: 0 }, { t: 3, x: 24, y: 60 }]);
  assert.ok(!/NaN|Infinity/.test(collapsed));
  assert.equal(collapsed, "M 12 30 M 12 0 L 24 60");
});
