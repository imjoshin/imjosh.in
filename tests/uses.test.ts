import { strict as assert } from "node:assert";
import { test } from "node:test";
import { usesItems } from "../content/uses.ts";
import { buildEvents, itemId, monthAt, monthIndex, parseMonth, parseYear, readTimelineMonth, usesAt } from "../src/lib/uses.ts";

test("the current snapshot contains exactly the authoritative active inventory", () => {
  const latest = usesAt(2026).categories.flatMap((category) => category.items.map((item) => item.id));
  assert.deepEqual(latest.sort(), usesItems.filter((item) => item.active).map(itemId).sort());
});

test("2010 starts with only the LG Banter and seven empty categories", () => {
  const snapshot = usesAt(2010);
  assert.deepEqual(snapshot.categories.flatMap((category) => category.items.map((item) => item.name)), ["LG Banter"]);
  assert.equal(snapshot.categories.filter((category) => !category.items.length).length, 7);
  assert.equal(snapshot.changes[0].date, "2010-06");
});

test("same-month replacements retire the old item before adding the new one", () => {
  const snapshot = usesAt(2020);
  assert.deepEqual(snapshot.categories.find((category) => category.key === "desktop")!.items.map((item) => item.name), ["Custom Ryzen 7 3700X / RTX 2070S Build"]);
  const desktopChanges = snapshot.changes.filter((event) => event.category === "desktop");
  assert.deepEqual(desktopChanges.map((event) => event.op), ["-", "+"]);
  assert.deepEqual(snapshot.categories.find((category) => category.key === "camera")!.items.map((item) => item.name), ["Canon EOS Rebel T7i"]);
});

test("retired equipment remains available historically and new badges match the selected year", () => {
  assert.equal(usesAt(2023).categories.find((category) => category.key === "mouse")!.items[0].name, "Razer Mamba Wireless");
  assert.equal(usesAt(2024).categories.find((category) => category.key === "mouse")!.items.length, 0);
  assert.equal(usesAt(2026).categories.find((category) => category.key === "mouse")!.items[0].isNew, true);
  assert.equal(usesAt(2027).categories.find((category) => category.key === "mouse")!.items[0].isNew, false);
  assert.equal(usesAt(2011).changes.length, 0);
});

test("every acquisition and retirement is preserved in chronological order", () => {
  const events = buildEvents();
  assert.equal(events.length, usesItems.length + usesItems.filter((item) => !item.active).length);
  for (let i = 1; i < events.length; i++) assert.ok(events[i - 1].date <= events[i].date);
});

test("shared year parameters accept only valid years in range", () => {
  assert.equal(parseYear("2014", 2026), 2014);
  for (const value of [null, "", "2009", "2027", "NaN", "2020.5", "2e3", "2020extra"]) assert.equal(parseYear(value, 2026), 2026);
});

test("monthly snapshots include acquisitions and retirements in their exact month", () => {
  assert.equal(usesAt("2010-05").categories.flatMap((category) => category.items).length, 0);
  assert.deepEqual(usesAt("2010-06").categories.flatMap((category) => category.items.map((item) => item.name)), ["LG Banter"]);
  assert.equal(usesAt("2020-03").categories.find((category) => category.key === "desktop")!.items[0].name, "Custom i7-4790K / GTX 970 Build");
  assert.equal(usesAt("2020-04").categories.find((category) => category.key === "desktop")!.items[0].name, "Custom Ryzen 7 3700X / RTX 2070S Build");
  assert.deepEqual(usesAt("2020-04").changes.map((event) => event.op), ["-", "+"]);
  assert.equal(usesAt("2020-04").categories.find((category) => category.key === "desktop")!.items[0].isNew, true);
  assert.equal(usesAt("2020-05").categories.find((category) => category.key === "desktop")!.items[0].isNew, false);
});

test("continuous positions resolve to months across year boundaries", () => {
  assert.equal(monthAt(47.49), "2013-12");
  assert.equal(monthAt(47.51), "2014-01");
  for (const month of ["2010-01", "2010-12", "2014-01", "2020-04", "2026-11"]) assert.equal(monthAt(monthIndex(month)), month);
});

test("month URLs reject invalid or future periods and keep legacy year links usable", () => {
  const now = "2026-11";
  assert.equal(parseMonth("2020-04", now), "2020-04");
  for (const month of [null, "", "2009-12", "2026-12", "2020-00", "2020-13", "2020-1", "2020-01-extra"]) assert.equal(parseMonth(month, now), now);
  assert.equal(readTimelineMonth(new URLSearchParams("year=2014"), now), "2014-12");
  assert.equal(readTimelineMonth(new URLSearchParams("year=2026"), now), now);
  assert.equal(readTimelineMonth(new URLSearchParams("year=2014&month=2020-04"), now), "2020-04");
});
