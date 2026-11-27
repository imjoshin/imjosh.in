import { strict as assert } from "node:assert";
import { test } from "node:test";
import { analyticsContext, analyticsDataAttributes, musicInspectionContext, type AnalyticsNode } from "../src/lib/analytics-context.ts";

function node(attributes: Record<string, unknown> = {}, parentElement: AnalyticsNode | null = null): AnalyticsNode {
  return { parentElement, getAttribute: name => attributes[name] === undefined ? null : String(attributes[name]) };
}

test("qualified music views retain their original section and ranking through a body portal", () => {
  const section = node({ "data-analytics-view": "favorites", "data-analytics-metric": "albums", "data-analytics-period": "365d" });
  const row = node({ "data-analytics-item-rank": 4 }, section);
  const anchor = node({ "data-analytics-item-slot": "title" }, row);
  const captured = musicInspectionContext(anchor, { kind: "album", name: "Example Album", artists: ["Example Artist"] }, "hover");
  const portal = node(analyticsDataAttributes(captured), node());
  assert.deepEqual(analyticsContext(portal), {
    section: "favorites", metric: "albums", period: "365d", item_type: "album", item_name: "Example Album",
    item_artists: "Example Artist", item_rank: 4, item_slot: "title", method: "hover",
  });
});

test("the same artist in different sections produces distinct inspection contexts", () => {
  const artist = { kind: "artist" as const, name: "Example Artist" };
  const picks = musicInspectionContext(node({ "data-analytics-view": "artist_picks", "data-analytics-period": "6m" }), artist, "hover");
  const rotation = musicInspectionContext(node({ "data-analytics-view": "heavy_rotation", "data-analytics-period": "spotify_short_term" }), artist, "hover");
  assert.equal(picks.item_name, rotation.item_name);
  assert.equal(picks.item_artists, artist.name);
  assert.notEqual(JSON.stringify(picks), JSON.stringify(rotation));
  assert.equal(analyticsContext(node(analyticsDataAttributes(rotation))).section, "heavy_rotation");
});

test("nearer song and chart context overrides broad period context without losing the chart", () => {
  const chart = node({ "data-analytics-section": "soundtrack", "data-analytics-chart": "soundtrack", "data-analytics-period": "all", "data-analytics-metric": "genres" });
  const songs = node({ "data-analytics-section": "soundtrack_songs", "data-analytics-bucket": "2026" }, chart);
  const anchor = node({ "data-analytics-item-rank": 2 }, songs);
  const context = musicInspectionContext(anchor, { kind: "track", name: "Example Song", artists: ["One", "Two"] }, "touch");
  assert.deepEqual(context, { section: "soundtrack_songs", chart: "soundtrack", metric: "genres", period: "all", bucket: "2026", item_rank: 2,
    item_type: "track", item_name: "Example Song", item_artists: "One, Two", method: "touch" });
  const recentPick = node({ "data-analytics-period": "all", "data-analytics-item-group": "all_time_pick" }, node({ "data-analytics-view": "artist_picks", "data-analytics-period": "6m" }));
  assert.equal(analyticsContext(recentPick).period, "all");
  assert.equal(analyticsContext(recentPick).section, "artist_picks");
});

test("input methods and recording artists distinguish otherwise identical item names", () => {
  const anchor = node({ "data-analytics-view": "favorites" });
  const one = musicInspectionContext(anchor, { kind: "track", name: "Same name", artists: ["One"] }, "keyboard");
  const two = musicInspectionContext(anchor, { kind: "track", name: "Same name", artists: ["Two"] }, "hover");
  assert.notEqual(JSON.stringify(one), JSON.stringify(two));
  assert.equal(one.method, "keyboard");
  for (const rank of ["", "0", "-1", "2.5", "NaN", "Infinity"]) assert.equal(analyticsContext(node({ "data-analytics-item-rank": rank })).item_rank, undefined);
});
