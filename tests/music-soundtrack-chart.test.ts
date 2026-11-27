import { strict as assert } from "node:assert";
import { test } from "node:test";
import { aggregateSoundtrack } from "../src/lib/music/soundtrack.ts";
import { soundtrackChartSeries } from "../src/lib/music/soundtrack-chart.ts";
import { musicLinePath } from "../src/lib/music/chart-interaction.ts";
import { musicTrack, spotifyListen } from "../src/lib/music/normalize.ts";
import type { Listen, MusicPlatform, SoundtrackSeries } from "../src/lib/music/types.ts";

test("every soundtrack metric, platform, and range retains zero buckets in a continuous line", () => {
  const rows: Listen[] = [];
  for (const platform of ["spotify", "google-play-music", "youtube-music"] satisfies MusicPlatform[]) {
    for (const date of ["2022-06-15", "2024-05-15", "2026-10-28", "2026-11-20"]) {
      for (let index = 0; index < 12; index++) rows.push({
        ...spotifyListen({ ts: date + "T12:00:00Z", master_metadata_track_name: "Main", master_metadata_album_artist_name: "Main", ms_played: 60000 }, "PRIVATE-ORIGINAL")!,
        id: platform + date + index, platform,
        track: musicTrack("Main", ["Main"], { album: "Main", genres: ["indie"] }),
      });
    }
  }
  const datasets = aggregateSoundtrack(rows, new Date("2026-11-26T20:00:00Z"));
  const before = JSON.stringify(datasets);
  assert.equal(Object.keys(datasets).length, 24);
  for (const [key, data] of Object.entries(datasets)) {
    for (const metric of ["genres", "artists", "albums"] as const) {
      const series = soundtrackChartSeries(data.metrics[metric].series, data.buckets.length, data.minimumPlays!);
      assert.ok(series.length, key + "/" + metric);
      for (const line of series) {
        assert.equal(line.plays.length, data.buckets.length);
        assert.ok(line.plays.some(plays => plays === 0), key + "/" + metric);
        assert.deepEqual(line.plays, data.metrics[metric].series.find(source => source.key === line.key)!.plays);
        const points = line.plays.map((plays, index) => ({ t: index, x: index * 10, y: 290 - plays }));
        const path = musicLinePath(points);
        assert.equal(path.match(/M/g)?.length, 1, key + "/" + metric);
        assert.equal(path.match(/[MLC]/g)?.length, data.buckets.length);
        assert.ok(!/NaN|Infinity/.test(path));
      }
    }
  }
  assert.equal(JSON.stringify(datasets), before);
});

test("null, sparse, and truncated series reach zero at internal and boundary buckets", () => {
  const legacy: SoundtrackSeries[] = JSON.parse('[{"key":"legacy","name":"Legacy","artists":[],"plays":[null,12,null,20]}]');
  const sparse = { key: "sparse", name: "Sparse", artists: [], plays: [0, 20, , 12] } as SoundtrackSeries;
  for (const minimum of [1, 11]) {
    const series = soundtrackChartSeries([...legacy, sparse], 6, minimum);
    assert.deepEqual(series.map(line => line.key), ["legacy", "sparse"]);
    for (const line of series) assert.deepEqual(line.plays, line.key === "legacy" ? [0, 12, 0, 20, 0, 0] : [0, 20, 0, 12, 0, 0]);
  }
  assert.deepEqual(legacy[0].plays, [null, 12, null, 20]);
  assert.equal(2 in sparse.plays, false);
});

test("zero filling preserves the play cutoff, qualifying totals, and deterministic legend order", () => {
  const series = [
    { key: "b", name: "B", artists: [], plays: [10, 11, 12] },
    { key: "a", name: "A", artists: [], plays: [0, 12, 11] },
    { key: "quiet", name: "Quiet", artists: [], plays: [1, 10, 0] },
  ];
  assert.deepEqual(soundtrackChartSeries(series, 3, 11).map(line => [line.key, line.plays]), [["a", [0, 12, 11]], ["b", [0, 11, 12]]]);
  assert.deepEqual(soundtrackChartSeries(series, 3, 1).map(line => [line.key, line.plays]), [["b", [10, 11, 12]], ["a", [0, 12, 11]], ["quiet", [1, 10, 0]]]);
  assert.deepEqual(soundtrackChartSeries(series, 0, 11), []);
  assert.deepEqual(soundtrackChartSeries([], 12, 11), []);
});
