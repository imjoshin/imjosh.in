import { strict as assert } from "node:assert";
import { test } from "node:test";
import { usesItems } from "../content/uses.ts";
import { buildEvents, itemId, parseYear, usesAt } from "../src/lib/uses.ts";

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
