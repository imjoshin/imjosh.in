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

test("average-time tooltips inherit their chart, displayed period, hour, and input method", () => {
  const chart = node({ "data-analytics-section": "hourly", "data-analytics-chart": "hourly", "data-analytics-metric": "average_listening_time", "data-analytics-period": "30d" });
  const surface = node({ "data-analytics-method": "keyboard" }, chart);
  const tooltip = node({ "data-analytics-inspect": "chart", "data-analytics-bucket": "09", "data-analytics-item-group": "chart_tooltip" }, surface);
  assert.deepEqual(analyticsContext(tooltip), { section: "hourly", chart: "hourly", metric: "average_listening_time", period: "30d", bucket: "09", item_group: "chart_tooltip", method: "keyboard" });
  assert.notDeepEqual(analyticsContext(tooltip), analyticsContext(node({ "data-analytics-bucket": "10" }, surface)));
  const weekday = node({ "data-analytics-section": "weekday", "data-analytics-chart": "weekday", "data-analytics-metric": "average_listening_time", "data-analytics-period": "365d" });
  assert.equal(analyticsContext(node({ "data-analytics-bucket": "Monday" }, weekday)).chart, "weekday");
  assert.equal(analyticsContext(node({ "data-analytics-bucket": "Monday" }, weekday)).period, "365d");
});

test("seasonal artist cards retain displayed season, rank, and period through portals", () => {
  const section = node({ "data-analytics-view": "season_unique", "data-analytics-period": "2025", "data-analytics-metric": "artists" });
  const season = (bucket: string) => node({ "data-analytics-chart": "season_unique", "data-analytics-bucket": bucket, "data-analytics-item-group": bucket }, section);
  const artist = { kind: "artist" as const, name: "Seasonal Artist" };
  const captured = musicInspectionContext(node({ "data-analytics-item-slot": "artist_name" }, node({ "data-analytics-item-rank": 3 }, season("winter"))), artist, "keyboard");
  assert.deepEqual(analyticsContext(node(analyticsDataAttributes(captured), node())), {
    section: "season_unique", chart: "season_unique", metric: "artists", period: "2025", bucket: "winter", item_group: "winter",
    item_type: "artist", item_name: artist.name, item_artists: artist.name, item_rank: 3, item_slot: "artist_name", method: "keyboard",
  });
  assert.notDeepEqual(captured, musicInspectionContext(node({ "data-analytics-item-rank": 3 }, season("summer")), artist, "keyboard"));
});
