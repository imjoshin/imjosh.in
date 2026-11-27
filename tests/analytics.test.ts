import { strict as assert } from "node:assert";
import { test } from "node:test";
import { analyticsEnabled, analyticsParams, analyticsUrl, countEvent, flushAnalytics, initializeAnalytics, trackEvent, trackPageView } from "../src/lib/analytics.ts";

test("analytics only enables on the production site or explicitly requested debug sessions", () => {
  assert.equal(analyticsEnabled("G-EXAMPLE123", "imjosh.in", true, false, false), true);
  for (const hostname of ["localhost", "127.0.0.1", "preview--imjoshin.netlify.app", "imjosh.in.evil.example"]) {
    assert.equal(analyticsEnabled("G-EXAMPLE123", hostname, true, false, false), false);
  }
  assert.equal(analyticsEnabled("G-EXAMPLE123", "localhost", false, true, false), true);
  assert.equal(analyticsEnabled("G-EXAMPLE123", "imjosh.in", false, false, false), false);
  assert.equal(analyticsEnabled("G-EXAMPLE123", "imjosh.in", true, false, true), false);
  for (const id of [undefined, "", "UA-123", 'G-123";alert(1)']) assert.equal(analyticsEnabled(id, "imjosh.in", true, false, false), false);
});

test("payloads remove arbitrary query strings, fragments, and credentials, while preserving campaign attribution", () => {
  const url = "https://user:secret@imjosh.in/music/?email=private@example.com&period=all&utm_source=newsletter#private";
  assert.equal(analyticsUrl(url), "https://imjosh.in/music/");
  assert.equal(analyticsUrl(url, true), "https://imjosh.in/music/?utm_source=newsletter");
  assert.equal(analyticsUrl("mailto:private@example.com"), "");
  assert.equal(analyticsUrl("not a URL"), "");
  assert.deepEqual(analyticsParams({ item_name: "x".repeat(200), count: 0, empty: undefined, invalid: NaN }), { item_name: "x".repeat(100), count: 0 });
});

test("pageviews deduplicate hydration and filters, preserve history, and attribute batches to the original route", t => {
  const browser: { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void } = {};
  const address = { hostname: "imjosh.in", pathname: "/", href: "https://imjosh.in/?secret=hidden&utm_source=test" };
  const preferences = { doNotTrack: "0", globalPrivacyControl: false };
  const page = { title: "Home", referrer: "https://example.com/?private=value" };
  const globals = { window: browser, location: address, navigator: preferences, document: page };
  for (const [key, value] of Object.entries(globals)) {
    const original = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true });
    t.after(() => { if (original) Object.defineProperty(globalThis, key, original); else Reflect.deleteProperty(globalThis, key); });
  }
  t.after(flushAnalytics);
  trackEvent("theme_change", { theme: "dark" });
  assert.equal(browser.dataLayer, undefined, "disabled analytics does not queue events");
  assert.equal(initializeAnalytics("G-EXAMPLE123", true), true);
  assert.equal(initializeAnalytics("G-EXAMPLE123", true), true);
  const commands = () => browser.dataLayer!.map(value => Array.from(value as ArrayLike<unknown>));
  const events = (name: string) => commands().filter(args => args[0] === "event" && args[1] === name).map(args => args[2] as Record<string, unknown>);
  assert.equal(commands().filter(args => args[0] === "config").length, 1);
  assert.equal((commands().find(args => args[0] === "config")![2] as Record<string, unknown>).send_page_view, false);
  trackPageView("/"); trackPageView("/");
  assert.equal(events("page_view").length, 1);
  for (let i = 0; i < 12; i++) countEvent("pew_shot");
  address.pathname = "/music/"; address.href = "https://imjosh.in/music/?period=all"; page.title = "Home";
  trackPageView("/music/");
  assert.equal(events("page_view")[1].page_title, "Music | Josh Johnson", "streaming metadata cannot leave the previous route's title");
  assert.equal(events("pew_shot")[0].interaction_count, 12);
  assert.equal(events("pew_shot")[0].page_path, "/");
  assert.equal(events("pew_shot")[0].page_location, "https://imjosh.in/?utm_source=test");
  address.href = "https://imjosh.in/music/?period=30d";
  trackPageView("/music/");
  assert.equal(events("page_view").length, 2, "filters are interactions, not visits");
  assert.equal(events("page_view")[1].page_referrer, "https://imjosh.in/?utm_source=test");
  address.pathname = "/"; address.href = "https://imjosh.in/"; page.title = "Home";
  trackPageView("/");
  assert.equal(events("page_view").length, 3, "returning via history counts a new view");
  assert.equal(events("page_view")[2].page_referrer, "https://imjosh.in/music/");
  preferences.globalPrivacyControl = true;
  trackEvent("theme_change", { theme: "dark" });
  assert.equal(events("theme_change").length, 0);
});
