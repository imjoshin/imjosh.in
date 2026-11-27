import { strict as assert } from "node:assert";
import { test } from "node:test";
import { hasMissingMusicHistory, musicHistoryGap } from "../src/lib/music/history-gap.ts";

test("missing Google Play Music history includes Nov 2014 through Apr 2020 only", () => {
  for (const key of ["2014-10", "2014-10-31", "2020-05", "2020-05-01", "2013", "2021"]) assert.equal(hasMissingMusicHistory(key), false, key);
  for (const key of ["2014-11", "2014-11-01", "2020-04", "2020-04-30", "2014", "2020"]) assert.equal(hasMissingMusicHistory(key), true, key);
});

test("seasonal overlap includes partial autumn and spring, with winter starting in December", () => {
  assert.equal(hasMissingMusicHistory("2014-2"), false);
  assert.equal(hasMissingMusicHistory("2014-3"), true);
  assert.equal(hasMissingMusicHistory("2015-0"), true);
  assert.equal(hasMissingMusicHistory("2020-1"), true);
  assert.equal(hasMissingMusicHistory("2020-2"), false);
});

test("bands clip to affected views without suggesting a boundary inside a wholly missing year", () => {
  assert.equal(musicHistoryGap([]), null);
  assert.equal(musicHistoryGap(["2013-01", "2013-12"]), null);
  assert.equal(musicHistoryGap(["2020-05", "2020-06"]), null);
  assert.deepEqual(musicHistoryGap(["2019-01", "2019-12"]), { start: 0, end: 1, startsHere: false, endsHere: false });
  const keys = Array.from({ length: 12 }, (_, i) => `2020-${String(i + 1).padStart(2, "0")}`);
  assert.deepEqual(musicHistoryGap(keys), { start: 0, end: 3.5 / 11, startsHere: false, endsHere: true });
});

test("yearly and seasonal bands interpolate partial buckets on their own axes", () => {
  const yearly = musicHistoryGap(["2013", "2014", "2015", "2016", "2017", "2018", "2019", "2020", "2021"]);
  assert.ok(yearly && yearly.start > 1 / 8 && yearly.start < 2 / 8 && yearly.end > 6 / 8 && yearly.end < 7 / 8);
  assert.equal(yearly.startsHere, true);
  assert.equal(yearly.endsHere, true);
  const seasonal = musicHistoryGap(["2014-2", "2014-3", "2015-0"], "cells");
  assert.ok(seasonal && seasonal.start > 1 / 3 && seasonal.start < 2 / 3);
  assert.equal(seasonal.end, 1);
  assert.equal(seasonal.endsHere, false);
  assert.equal(musicHistoryGap(["2019"] )?.end, 1);
});
