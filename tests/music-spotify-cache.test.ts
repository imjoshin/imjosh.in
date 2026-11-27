import { strict as assert } from "node:assert";
import { test } from "node:test";
import { cacheMusicSpotify, MUSIC_SPOTIFY_CACHE_KEY, readCachedMusicSpotify } from "../src/lib/music/spotify-cache.ts";
import type { SpotifySnapshot } from "../src/lib/music/types.ts";

function memory() {
  const values = new Map<string, string>(), writes: string[] = [];
  return {
    writes,
    getItem: (key: string) => values.get(key) ?? null,
    setItem(key: string, value: string) { values.set(key, value); writes.push(value); },
    removeItem(key: string) { values.delete(key); },
  };
}
const saved = (generatedAt = "2026-11-27T12:00:00Z"): SpotifySnapshot => ({
  generatedAt,
  ranges: { short_term: {
    tracks: Array.from({ length: 7 }, (_, i) => ({ key: `track-${i}`, name: `Song ${i}`, artists: ["Artist"], image: `https://i.scdn.co/image/cover-${i}`, url: null, plays: 0, msPlayed: 0 })),
    artists: [{ key: "artist", name: "Artist", artists: [], image: "https://i.scdn.co/image/portrait", url: null, plays: 0, msPlayed: 0 }],
  } },
  playlists: [],
});

test("cached favorites restore all seven rotation tracks and photos, but never replace a newer bundled snapshot", () => {
  const storage = memory(), cached = saved(), older = saved("2026-11-26T12:00:00Z"), newer = saved("2026-11-28T12:00:00Z");
  cacheMusicSpotify(cached, storage);
  assert.deepEqual(readCachedMusicSpotify(null, storage), cached);
  assert.deepEqual(readCachedMusicSpotify(older, storage), cached);
  assert.deepEqual(readCachedMusicSpotify(cached, storage), cached);
  assert.equal(readCachedMusicSpotify(newer, storage), newer);
});

test("changed rankings and artwork replace the cache while unchanged refreshes avoid writes", () => {
  const storage = memory(), first = saved();
  cacheMusicSpotify(first, storage);
  cacheMusicSpotify(structuredClone(first), storage);
  assert.equal(storage.writes.length, 1);
  const changed = structuredClone(first);
  changed.ranges.short_term.tracks.reverse();
  changed.ranges.short_term.artists[0].image = "https://i.scdn.co/image/new-portrait";
  cacheMusicSpotify(changed, storage);
  assert.equal(storage.writes.length, 2);
  assert.deepEqual(readCachedMusicSpotify(first, storage), changed);
  cacheMusicSpotify(null, storage);
  assert.equal(storage.getItem(MUSIC_SPOTIFY_CACHE_KEY), null);
});

test("missing, corrupt, and incompatible browser caches preserve the bundled fallback", () => {
  const storage = memory(), initial = saved();
  assert.equal(readCachedMusicSpotify(initial, storage), initial);
  for (const value of ["{", "null", "[]", "{}", JSON.stringify({ ...initial, generatedAt: "invalid" }), JSON.stringify({ ...initial, ranges: { short_term: { tracks: [null], artists: [] } } }), JSON.stringify({ ...initial, playlists: [null] })]) {
    storage.setItem(MUSIC_SPOTIFY_CACHE_KEY, value);
    assert.equal(readCachedMusicSpotify(initial, storage), initial);
    assert.equal(readCachedMusicSpotify(null, storage), null);
  }
});

test("blocked or full browser storage cannot interrupt the music page", () => {
  const storage = {
    getItem(): never { throw new Error("Storage is blocked"); },
    setItem(): never { throw new Error("Quota exceeded"); },
    removeItem(): never { throw new Error("Storage is blocked"); },
  };
  const initial = saved();
  assert.equal(readCachedMusicSpotify(initial, storage), initial);
  assert.doesNotThrow(() => cacheMusicSpotify(initial, storage));
  assert.doesNotThrow(() => cacheMusicSpotify(initial, { ...storage, getItem: () => null }));
  assert.doesNotThrow(() => cacheMusicSpotify(null, storage));
});
