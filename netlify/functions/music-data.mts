import type { Config } from "@netlify/functions";
import { blobStore, PUBLIC_STORE, readJson, type MusicStore } from "../../scripts/music/store.ts";
import { digest } from "../../src/lib/music/normalize.ts";
import type { MusicManifest } from "../../src/lib/music/types.ts";

export const createMusicDataHandler = (getPublicStore: () => MusicStore) => async (request: Request) => {
  if (request.method !== "GET" && request.method !== "HEAD") return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
  const file = new URL(request.url).searchParams.get("file") || "manifest.json";
  if (file !== "manifest.json" && file !== "playback.json" && !/^datasets\/[a-f0-9]{24}\.json$/.test(file)) return new Response(null, { status: 404 });
  const store = getPublicStore();
  let data = await store.get(file);
  if (!data && file === "playback.json") {
    const manifest = await readJson<MusicManifest>(store, "manifest.json");
    const saved = manifest?.files.playback;
    if (saved && /^datasets\/[a-f0-9]{24}\.json$/.test(saved)) data = await store.get(saved);
  }
  if (!data) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  const etag = `"${digest(data)}"`;
  const headers = { "Content-Type": "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff", "Cache-Control": file === "manifest.json" || file === "playback.json" ? "public, no-cache" : "public, max-age=31536000, immutable", ETag: etag };
  // GET and HEAD use weak comparison, including validator lists and wildcard matches.
  const unchanged = request.headers.get("If-None-Match")?.split(",").some(value => value.trim() === "*" || value.trim().replace(/^W\//, "") === etag);
  if (unchanged) return new Response(null, { status: 304, headers });
  return new Response(request.method === "HEAD" ? null : data as BodyInit, { headers });
};
export default createMusicDataHandler(() => blobStore(PUBLIC_STORE));
export const config: Config = { path: "/api/music" };
