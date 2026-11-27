import { strict as assert } from "node:assert";
import { test } from "node:test";
import { existsSync } from "node:fs";
import { usesItems } from "../content/uses.ts";
import { buildEvents, categories, itemId, itemName, itemSpec, monthAt, monthIndex, parseMonth, parseYear, readTimelineMonth, usesAt } from "../src/lib/uses.ts";

test("the current snapshot contains exactly the authoritative active inventory", () => {
  const latest = usesAt(2026).categories.flatMap((category) => category.items.map((item) => item.id));
  assert.deepEqual(latest.sort(), usesItems.filter((item) => item.active).map(itemId).sort());
});

test("2010 keeps the Dell setup alongside the first phone", () => {
  const snapshot = usesAt(2010);
  assert.deepEqual(snapshot.categories.filter((category) => category.key !== "console").flatMap((category) => category.items.map((item) => item.name)), ["Dell Dimension 2400 (approx.)", 'Dell E773c 17" CRT (approx.)', "Dell SK-8115 (approx.)", "Dell M-UVDEL1 (approx.)", "LG Banter"]);
  assert.equal(snapshot.categories.filter((category) => !category.items.length).length, categories.length - 6);
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
  assert.equal(usesAt(2012).changes.length, 0);
});

test("every acquisition and retirement is preserved in chronological order", () => {
  const events = buildEvents();
  assert.equal(events.length, usesItems.length + usesItems.filter((item) => !item.active).length);
  for (let i = 1; i < events.length; i++) assert.ok(events[i - 1].date <= events[i].date);
});

test("category history distinguishes never-owned gear from an empty retired category", () => {
  const desktop = (month: string) => usesAt(month).categories.find((category) => category.key === "desktop")!;
  assert.equal(desktop("2007-12").hasHistory, false);
  assert.equal(desktop("2007-12").items.length, 0);
  assert.equal(desktop("2008-01").hasHistory, true);
  assert.equal(desktop("2008-01").items.length, 1);
  assert.equal(desktop("2013-09").hasHistory, true);
  assert.equal(desktop("2013-09").items.length, 0);
  // Reading a later period must not mark earlier snapshots as previously owned.
  assert.equal(desktop("2007-12").hasHistory, false);
});

test("an acquisition and retirement within one month still count as category history", () => {
  const desktop = usesItems.find((item) => item.category === "desktop" && item.subtype === "computer")!;
  const items = [{ ...desktop, acquireDate: "2019-05-14", active: false as const, doneDate: "2019-05-25" }];
  const category = (month: string) => usesAt(month, items).categories.find((entry) => entry.key === "desktop")!;
  assert.equal(category("2019-04").hasHistory, false);
  assert.equal(category("2019-05").hasHistory, true);
  assert.equal(category("2019-05").items.length, 0);
  assert.equal(category("2019-06").hasHistory, true);
});

test("shared year parameters accept only valid years in range", () => {
  assert.equal(parseYear("2014", 2026), 2014);
  assert.equal(parseYear("2008", 2026), 2008);
  assert.equal(parseYear("2009", 2026), 2009);
  assert.equal(parseYear("2000", 2026), 2000);
  for (const value of [null, "", "1999", "2027", "NaN", "2020.5", "2e3", "2020extra"]) assert.equal(parseYear(value, 2026), 2026);
});

test("monthly snapshots include acquisitions and retirements in their exact month", () => {
  assert.equal(usesAt("2010-05").categories.find((category) => category.key === "phone")!.items.length, 0);
  assert.deepEqual(usesAt("2010-06").categories.find((category) => category.key === "phone")!.items.map((item) => item.name), ["LG Banter"]);
  assert.equal(usesAt("2020-03").categories.find((category) => category.key === "desktop")!.items[0].name, "Custom i7-4790K / GTX 970 Build");
  assert.equal(usesAt("2020-04").categories.find((category) => category.key === "desktop")!.items[0].name, "Custom Ryzen 7 3700X / RTX 2070S Build");
  assert.deepEqual(usesAt("2020-04").changes.map((event) => event.op), ["-", "+"]);
  assert.equal(usesAt("2020-04").categories.find((category) => category.key === "desktop")!.items[0].isNew, true);
  assert.equal(usesAt("2020-05").categories.find((category) => category.key === "desktop")!.items[0].isNew, false);
});

test("continuous positions resolve to months across year boundaries", () => {
  const boundary = monthIndex("2014-01");
  assert.equal(monthAt(boundary - .51), "2013-12");
  assert.equal(monthAt(boundary - .49), "2014-01");
  assert.equal(monthAt(0), "2000-01");
  for (const month of ["2000-01", "2000-12", "2008-01", "2008-12", "2010-01", "2010-12", "2014-01", "2020-04", "2026-11"]) assert.equal(monthAt(monthIndex(month)), month);
});

test("month URLs reject invalid or future periods and keep legacy year links usable", () => {
  const now = "2026-11";
  assert.equal(parseMonth("2020-04", now), "2020-04");
  assert.equal(parseMonth("2008-01", now), "2008-01");
  assert.equal(parseMonth("2000-01", now), "2000-01");
  for (const month of [null, "", "1999-12", "2026-12", "2020-00", "2020-13", "2020-1", "2020-01-extra"]) assert.equal(parseMonth(month, now), now);
  assert.equal(readTimelineMonth(new URLSearchParams("year=2000"), now), "2000-12");
  assert.equal(readTimelineMonth(new URLSearchParams("year=2008"), now), "2008-12");
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

test("every product has sourced images and nonempty specifications", () => {
  for (const item of usesItems) {
    assert.ok(item.producer.trim(), item.model);
    assert.ok(Object.keys(item.specs).length > 0, item.model);
    assert.ok(Object.values(item.specs).every((value) => typeof value === "string" && value.trim()), item.model);
    assert.ok(Object.keys(item.specs).length >= 4, item.model);
    assert.ok(item.image.alt.trim(), item.model);
    assert.match(item.image.src, /^\/gear\/[a-z0-9-]+\.(png|webp|jpg)$/);
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

test("computer summaries follow the first two known specifications", () => {
  const computers = usesItems.filter((item) => item.category === "laptop" || item.subtype === "computer");
  for (const item of computers) {
    assert.deepEqual(Object.keys(item.specs).slice(0, 2), item.subtype === "computer"
      ? ["Processor", item.gpu ? "Graphics" : "Memory"]
      : ["Memory", item.make === "Apple" ? "Processor" : "Graphics"]);
  }
  const desktop = computers.find((item) => item.make === "iBUYPOWER")!;
  const macbook = computers.find((item) => item.make === "Apple")!;
  assert.equal(itemSpec(desktop), "Intel Core i9-14900KF (8x 3.20GHz + 16x 2.40GHz) · GeForce RTX 5080 16GB GDDR7");
  assert.equal(itemSpec(macbook), "48GB unified memory · Apple M4 Pro (14-core CPU, 20-core GPU)");
  assert.equal(itemSpec({ ...desktop, specs: { Storage: "4TB SSD", Memory: "64GB RAM", Graphics: "RTX 5080" } }), "4TB SSD · 64GB RAM");
});

test("snapshot details refer to the authoritative products at historical and current dates", () => {
  for (const month of ["2008-01", "2010-06", "2015-10", "2020-04", "2024-04", "2026-11"]) {
    for (const item of usesAt(month).categories.flatMap((category) => category.items)) {
      assert.equal(item.details, usesItems.find((original) => itemId(original) === item.id));
    }
  }
});

test("the Dell period references stay approximate and span 2008 through August 2013", () => {
  const dell = usesItems.filter((item) => item.make === "Dell");
  assert.equal(dell.length, 4);
  assert.ok(dell.every((item) => item.acquireDate === "2008" && !item.active && item.doneDate === "2013-09"));
  assert.ok(dell.every((item) => item.modelApproximate && itemName(item).endsWith(" (approx.)")));
  assert.ok(usesItems.filter((item) => item.make !== "Dell").every((item) => !item.modelApproximate && !itemName(item).endsWith(" (approx.)")));
  assert.deepEqual(dell.map((item) => item.model), ["Dimension 2400", 'E773c 17" CRT', "SK-8115", "M-UVDEL1"]);
  assert.equal(itemSpec(dell.find((item) => item.subtype === "computer")!), "Intel Pentium 4 · 256MB RAM");
  const desktop = dell.find((item) => item.subtype === "computer")!;
  assert.equal(desktop.gpu, undefined);
  assert.equal(desktop.storage, undefined);
  assert.equal(desktop.os, undefined);
  for (const month of ["2008-01", "2008-12", "2013-08"]) {
    assert.equal(usesAt(month).categories.flatMap((category) => category.items).filter((item) => item.details.make === "Dell").length, 4);
  }
  assert.equal(usesAt("2013-09").categories.flatMap((category) => category.items).filter((item) => item.details.make === "Dell").length, 0);
  assert.deepEqual(usesAt("2013-09").changes.filter((event) => event.item.make === "Dell").map((event) => [event.date, event.op]), Array.from({ length: 4 }, () => ["2013-09", "-"]));
  assert.deepEqual(usesAt(2008).changes.filter((event) => event.item.make === "Dell").map((event) => event.date), ["2008", "2008", "2008", "2008"]);
  assert.ok(usesAt("2008-12").categories.flatMap((category) => category.items).filter((item) => item.details.make === "Dell").every((item) => item.isNew));
  assert.ok(usesAt("2009-01").categories.flatMap((category) => category.items).every((item) => !item.isNew));
});

test("the January 2026 display upgrade retains the portable monitor and replaces earlier desktop displays", () => {
  const monitors = (month: string) => usesAt(month).categories.find((category) => category.key === "monitor")!.items;
  assert.equal(monitors("2021-11").filter((item) => item.name.includes("27QN600")).length, 0);
  assert.equal(monitors("2021-12").filter((item) => item.name.includes("27QN600")).length, 1);
  assert.equal(monitors("2023-03").filter((item) => item.name.includes("27QN600")).length, 2);
  assert.ok(monitors("2025-12").some((item) => item.name.includes("PG34WCDM")));
  assert.ok(monitors("2025-12").some((item) => item.name.includes("34GP63A")));
  assert.deepEqual(monitors("2026-01").map((item) => item.name).sort(), [
    'LG UltraGear 34G600A-B 34"',
    'Samsung Odyssey G9 G95C 49"',
    'Upperizon 16" QHD Portable Monitor',
  ].sort());
  const changes = usesAt("2026-01").changes.filter((event) => event.category === "monitor");
  assert.equal(changes.filter((event) => event.op === "-").length, 4);
  assert.equal(changes.filter((event) => event.op === "+").length, 2);
  assert.ok(changes.every((event) => event.date === "2026-01-19"));
});

test("the Canon lenses appear in their acquisition months without replacing the Sigma", () => {
  const lenses = (month: string) => usesAt(month).categories.find((category) => category.key === "lens")!.items.map((item) => item.name);
  assert.equal(lenses("2022-04").length, 1);
  assert.ok(lenses("2022-05").includes("Canon EF-S 24mm f/2.8 STM"));
  assert.equal(lenses("2023-05").length, 2);
  assert.deepEqual(lenses("2023-06"), [
    "Canon EF-S 18-135mm f/3.5-5.6 IS USM",
    "Canon EF-S 24mm f/2.8 STM",
    "Sigma 50mm F1.4 DG HSM Art",
  ]);
});

test("over-ear headphones, earbuds and microphones each retain one active item through their replacements", () => {
  for (let position = 0; position <= monthIndex("2026-11"); position++) {
    const inventory = usesAt(monthAt(position)).categories.flatMap((category) => category.items.map((item) => item.details));
    for (const subtype of ["headphones", "earbuds", "microphone"]) {
      assert.ok(inventory.filter((item) => item.subtype === subtype).length <= 1, `${monthAt(position)}: ${subtype}`);
    }
  }
  const earbuds = (month: string) => usesAt(month).categories.find((category) => category.key === "audio")!.items.filter((item) => item.details.subtype === "earbuds").map((item) => item.name);
  assert.deepEqual(earbuds("2018-05"), ["Shure SE215-CL-UNI"]);
  assert.deepEqual(earbuds("2018-06"), ["KZ ZST"]);
  assert.deepEqual(earbuds("2023-03"), ["Google Pixel Buds Pro"]);
  const microphones = (month: string) => usesAt(month).categories.find((category) => category.key === "audio")!.items.filter((item) => item.details.subtype === "microphone").map((item) => item.name);
  assert.deepEqual(microphones("2023-02"), ["Zalman ZM-MIC1"]);
  assert.deepEqual(microphones("2023-03"), ["Shure MV7"]);
});

test("the approved display order includes microphones in Audio", () => {
  assert.deepEqual(categories.map(([, label]) => label), ["Desktop", "Monitors", "Keyboard", "Mouse", "Laptop", "Phone", "Camera", "Lenses", "Desk", "Audio", "Consoles"]);
  const audio = usesAt("2026-11").categories.find((category) => category.key === "audio")!;
  assert.deepEqual(audio.items.map((item) => item.name).sort(), ["Google Pixel Buds Pro", "Sennheiser HD 4.50 BTNC", "Shure MV7"].sort());
  assert.equal(audio.items.find((item) => item.name === "Shure MV7")!.details.category, "microphone");
});

test("approved desk equipment has its own category without excluded household gear", () => {
  const desk = usesAt("2026-11").categories.find((category) => category.key === "desk")!.items;
  assert.ok(desk.some((item) => item.name === "VIVO DESK-V102E"));
  assert.ok(desk.some((item) => item.name === "Logitech Brio 4K"));
  assert.ok(desk.some((item) => item.name === "VIVO STAND-V257R"));
  const names = usesItems.map((item) => `${item.make} ${item.model}`).join("\n");
  for (const excluded of ["DESK-V102EW", "MasterKeys", "Sonar", "K400", "Bnnwa", "EF-M 15-45mm"]) assert.ok(!names.includes(excluded), excluded);
});

test("the black BEKANT corner desk is replaced by the VIVO frame in July 2020", () => {
  const desks = (month: string) => usesAt(month).categories.find((category) => category.key === "desk")!.items.filter((item) => item.details.subtype === "desk").map((item) => item.name);
  assert.deepEqual(desks("2018-08"), []);
  assert.deepEqual(desks("2018-09"), ["IKEA BEKANT Corner Desk"]);
  assert.deepEqual(desks("2020-06"), ["IKEA BEKANT Corner Desk"]);
  assert.deepEqual(desks("2020-07"), ["VIVO DESK-V102E"]);
  const bekant = usesItems.find((item) => item.make === "IKEA" && item.model === "BEKANT Corner Desk")!;
  assert.equal(bekant.acquireDate, "2018-09");
  assert.equal(bekant.active, false);
  if (!bekant.active) assert.equal(bekant.doneDate, "2020-07-14");
  assert.deepEqual(usesAt("2020-07").changes.filter((event) => event.category === "desk" && event.item.subtype === "desk").map((event) => [event.date, event.op, event.item.make]), [["2020-07-14", "-", "IKEA"], ["2020-07-14", "+", "VIVO"]]);
});

test("console snapshots preserve separate home and portable histories until Switch replaces both", () => {
  const models = (month: string) => usesAt(month).categories.find((category) => category.key === "console")!.items.map((item) => item.details.model).sort();
  for (const [month, expected] of [
    ["2000-11", []],
    ["2000-12", ["Game Boy Color"]],
    ["2001-07", ["64", "Game Boy Color"]],
    ["2001-11", ["64", "Game Boy Color"]],
    ["2001-12", ["GameCube", "Game Boy Advance"]],
    ["2004-12", ["GameCube", "DS"]],
    ["2006-07", ["GameCube", "DS Lite"]],
    ["2006-11", ["Wii", "DS Lite"]],
    ["2011-03", ["Wii", "3DS"]],
    ["2014-11", ["Wii U", "3DS"]],
    ["2016-11", ["Wii U", "New 3DS XL (Galaxy Style)"]],
    ["2017-06", ["Wii U", "New 3DS XL (Galaxy Style)"]],
    ["2017-07", ["Switch"]],
    ["2025-05", ["Switch"]],
    ["2025-06", ["Switch 2"]],
    ["2026-11", ["Switch 2"]],
  ] as [string, string[]][]) assert.deepEqual(models(month), expected.sort(), month);

  const july = usesAt("2017-07").changes.filter((event) => event.category === "console");
  assert.deepEqual(july.map((event) => [event.op, event.item.model]), [["-", "Wii U"], ["-", "New 3DS XL (Galaxy Style)"], ["+", "Switch"]]);
  assert.deepEqual(usesAt("2025-06").changes.filter((event) => event.category === "console").map((event) => [event.op, event.item.model]), [["-", "Switch"], ["+", "Switch 2"]]);
});

test("console replacements are recorded in content and overlapping records are never hidden", () => {
  const consoles = usesItems.filter((item) => item.category === "console");
  assert.equal(consoles.length, 12);
  assert.ok(consoles.every((item) => /^\d{4}-\d{2}$/.test(item.acquireDate)));
  assert.deepEqual(consoles.filter((item) => item.active).map((item) => item.model), ["Switch 2"]);
  for (let position = monthIndex("2000-12"); position <= monthIndex("2026-11"); position++) {
    const month = monthAt(position);
    const active = consoles.filter((item) => item.acquireDate <= month && (item.active || item.doneDate > month));
    for (const subtype of ["home", "portable", "hybrid"]) assert.ok(active.filter((item) => item.subtype === subtype).length <= 1, `${month}: ${subtype}`);
    if (active.some((item) => item.subtype === "hybrid")) assert.equal(active.length, 1, month);
  }
  const home = consoles.find((item) => item.subtype === "home")!;
  const overlapping = [{ ...home, active: true as const }, { ...home, model: "Another home console", acquireDate: "2001-08", active: true as const }];
  assert.equal(usesAt("2001-09", overlapping).categories.find((category) => category.key === "console")!.items.length, 2);
  assert.equal(consoles.find((item) => item.model === "New 3DS XL (Galaxy Style)")!.acquireDate, "2016-11");
});
