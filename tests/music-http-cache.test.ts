import { strict as assert } from "node:assert";
import { test } from "node:test";
import { createMusicDataHandler } from "../netlify/functions/music-data.mts";
import { digest } from "../src/lib/music/normalize.ts";
import { writeJson, type MusicStore } from "../scripts/music/store.ts";

const memory = (): MusicStore => {
  const values = new Map<string, Uint8Array>();
  return { async get(key) { return values.get(key) || null; }, async set(key, value) { values.set(key, value); }, async list(prefix) { return [...values.keys()].filter(key => key.startsWith(prefix)); } };
};
const request = (file: string, init?: RequestInit) => new Request(`https://imjosh.in/api/music?file=${encodeURIComponent(file)}`, init);

for (const file of ["manifest.json", "playback.json"]) {
  test(`${file} revalidates unchanged JSON and replaces the browser cache when its bytes change`, async () => {
    const store = memory(), handler = createMusicDataHandler(() => store);
    const original = { version: 1, value: "original" }, updated = { ...original, value: "updated" };
    await writeJson(store, file, original);
    const first = await handler(request(file));
    const etag = first.headers.get("ETag")!;
    assert.equal(first.status, 200);
    assert.equal(first.headers.get("Cache-Control"), "public, no-cache");
    assert.equal(first.headers.get("Content-Type"), "application/json; charset=utf-8");
    assert.equal(first.headers.get("X-Content-Type-Options"), "nosniff");
    assert.equal(etag, `"${digest(JSON.stringify(original))}"`);
    assert.deepEqual(await first.json(), original);

    // Rewriting identical bytes must not invalidate the browser's saved response.
    await writeJson(store, file, original);
    for (const method of ["GET", "HEAD"]) {
      for (const validator of [etag, `W/${etag}`, `"older", W/${etag}`, "*"]) {
        const unchanged = await handler(request(file, { method, headers: { "If-None-Match": validator } }));
        assert.equal(unchanged.status, 304);
        assert.equal(unchanged.body, null);
        assert.equal(unchanged.headers.get("ETag"), etag);
        assert.equal(unchanged.headers.get("Cache-Control"), first.headers.get("Cache-Control"));
      }
    }

    await writeJson(store, file, updated);
    const changed = await handler(request(file, { headers: { "If-None-Match": etag } }));
    assert.equal(changed.status, 200);
    assert.notEqual(changed.headers.get("ETag"), etag);
    assert.deepEqual(await changed.json(), updated);
    const head = await handler(request(file, { method: "HEAD", headers: { "If-None-Match": etag } }));
    assert.equal(head.status, 200);
    assert.equal(head.body, null);
    assert.equal(head.headers.get("ETag"), changed.headers.get("ETag"));
  });
}

test("content-hashed datasets remain immutable with independent validators", async () => {
  const store = memory(), handler = createMusicDataHandler(() => store);
  const first = { plays: 1 }, second = { plays: 2 };
  const firstFile = `datasets/${digest(JSON.stringify(first)).slice(0, 24)}.json`;
  const secondFile = `datasets/${digest(JSON.stringify(second)).slice(0, 24)}.json`;
  await writeJson(store, firstFile, first); await writeJson(store, secondFile, second);
  const response = await handler(request(firstFile));
  assert.equal(response.headers.get("Cache-Control"), "public, max-age=31536000, immutable");
  const etag = response.headers.get("ETag")!;
  const unchanged = await handler(request(firstFile, { headers: { "If-None-Match": etag } }));
  assert.equal(unchanged.status, 304);
  assert.equal(unchanged.body, null);
  assert.equal(unchanged.headers.get("Cache-Control"), response.headers.get("Cache-Control"));
  const changed = await handler(request(secondFile, { headers: { "If-None-Match": etag } }));
  assert.equal(changed.status, 200);
  assert.notEqual(changed.headers.get("ETag"), etag);
  assert.deepEqual(await changed.json(), second);
  assert.deepEqual(await (await handler(request(firstFile))).json(), first);
});

test("playback validators follow the legacy fallback and the first standalone publication", async () => {
  const store = memory(), handler = createMusicDataHandler(() => store);
  const legacyFile = `datasets/${"a".repeat(24)}.json`;
  await writeJson(store, "manifest.json", { files: { playback: legacyFile } });
  await writeJson(store, legacyFile, { status: "playing", track: "old" });
  const legacy = await handler(request("playback.json")), etag = legacy.headers.get("ETag")!;
  assert.equal(legacy.headers.get("Cache-Control"), "public, no-cache");
  assert.equal((await handler(request("playback.json", { headers: { "If-None-Match": etag } }))).status, 304);
  await writeJson(store, "playback.json", { status: "stopped", track: null });
  const current = await handler(request("playback.json", { headers: { "If-None-Match": etag } }));
  assert.equal(current.status, 200);
  assert.notEqual(current.headers.get("ETag"), etag);
  assert.deepEqual(await current.json(), { status: "stopped", track: null });
});

test("missing files never return 304 or a cacheable error and can be published later", async () => {
  for (const file of ["manifest.json", "playback.json", `datasets/${"b".repeat(24)}.json`]) {
    const store = memory(), handler = createMusicDataHandler(() => store);
    const missing = await handler(request(file, { headers: { "If-None-Match": "*" } }));
    assert.equal(missing.status, 404);
    assert.equal(missing.headers.get("Cache-Control"), "no-store");
    assert.equal(missing.headers.get("ETag"), null);
    await writeJson(store, file, { version: 1 });
    assert.equal((await handler(request(file))).status, 200);
  }
});

test("conditional requests preserve the method and public filename restrictions", async () => {
  const handler = createMusicDataHandler(() => { throw new Error("Must not access storage"); });
  for (const file of ["../private.json", "credentials/spotify.json", "datasets/not-a-hash.json"]) {
    assert.equal((await handler(request(file, { headers: { "If-None-Match": "*" } }))).status, 404);
  }
  const post = await handler(request("manifest.json", { method: "POST", headers: { "If-None-Match": "*" } }));
  assert.equal(post.status, 405);
  assert.equal(post.headers.get("Allow"), "GET, HEAD");
});
