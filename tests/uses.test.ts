import { strict as assert } from "node:assert";
import { test } from "node:test";
import { existsSync } from "node:fs";
import { usesItems } from "../content/uses.ts";
import { buildEvents, itemId, itemSpec, monthAt, monthIndex, parseMonth, parseYear, readTimelineMonth, usesAt } from "../src/lib/uses.ts";

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

test("the November 17 phone upgrade preserves exact dates and monthly history", () => {
  const october = usesAt("2026-10").categories.find((category) => category.key === "phone")!;
  const november = usesAt("2026-11");
  assert.deepEqual(october.items.map((item) => item.name), ["Google Pixel 9 Pro"]);
  assert.deepEqual(november.categories.find((category) => category.key === "phone")!.items.map((item) => [item.name, item.isNew]), [["Google Pixel 11 Pro", true]]);
  assert.deepEqual(november.changes.map((event) => [event.date, event.op, event.item.model]), [
    ["2026-11-17", "-", "Pixel 9 Pro"],
    ["2026-11-17", "+", "Pixel 11 Pro"],
  ]);
});

test("every historical product has sourced details and a local product image", () => {
  for (const item of usesItems) {
    assert.ok(item.producer.trim(), item.model);
    assert.ok(Object.keys(item.specs).length >= 4, item.model);
    assert.ok(Object.values(item.specs).every((value) => typeof value === "string" && value.trim()), item.model);
    assert.ok(item.image.alt.trim(), item.model);
    assert.match(item.image.src, /^\/gear\/[a-z0-9-]+\.(png|webp)$/);
    assert.ok(existsSync(new URL(`../public${item.image.src}`, import.meta.url)), item.image.src);
    assert.ok(item.image.sourceUrl?.startsWith("https://"), item.model);
    assert.ok(item.sources.length > 0 && item.sources.every((source) => source.url.startsWith("https://")), item.model);
    if (item.releaseYear !== null) assert.ok(item.releaseYear <= Number(item.acquireDate.slice(0, 4)), item.model);
  }
});

test("expanded specifications preserve the recorded ownership configuration", () => {
  const fields = { cpu: "Processor", ram: "Memory", gpu: "Graphics", storage: "Storage", case: "Case", cooling: "Cooling", motherboard: "Motherboard", psu: "Power supply", os: "Operating system", size: "Screen size", resolution: "Resolution", panelType: "Panel", refreshRate: "Refresh rate", display: "Display", focalLength: "Focal length", maxAperture: "Maximum aperture" };
  for (const item of usesItems) {
    for (const [field, label] of Object.entries(fields)) {
      const value = (item as unknown as Record<string, unknown>)[field];
      if (value) assert.equal(item.specs[label], value, `${item.model}: ${label}`);
    }
  }
});

test("computer summaries follow the first two specs with memory before graphics or processor", () => {
  const computers = usesItems.filter((item) => item.category === "laptop" || item.subtype === "computer");
  for (const item of computers) {
    assert.deepEqual(Object.keys(item.specs).slice(0, 2), ["Memory", item.make === "Apple" ? "Processor" : "Graphics"]);
  }
  const desktop = computers.find((item) => item.make === "iBUYPOWER")!;
  const macbook = computers.find((item) => item.make === "Apple")!;
  assert.equal(itemSpec(desktop), "64GB DDR5-6000MHz · GeForce RTX 5080 16GB GDDR7");
  assert.equal(itemSpec(macbook), "48GB unified memory · Apple M4 Pro (14-core CPU, 20-core GPU)");
  assert.equal(itemSpec({ ...desktop, specs: { Storage: "4TB SSD", Memory: "64GB RAM", Graphics: "RTX 5080" } }), "4TB SSD · 64GB RAM");
});

test("snapshot details refer to the authoritative products at historical and current dates", () => {
  for (const month of ["2010-06", "2015-10", "2020-04", "2024-04", "2026-11"]) {
    for (const item of usesAt(month).categories.flatMap((category) => category.items)) {
      assert.equal(item.details, usesItems.find((original) => itemId(original) === item.id));
    }
  }
});
