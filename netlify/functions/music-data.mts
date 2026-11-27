import type { Config } from "@netlify/functions";
import { blobStore, PUBLIC_STORE, readJson } from "../../scripts/music/store.ts";
import type { MusicManifest } from "../../src/lib/music/types.ts";

export default async (request: Request) => {
  if (request.method !== "GET" && request.method !== "HEAD") return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
  const file = new URL(request.url).searchParams.get("file") || "manifest.json";
  if (file !== "manifest.json" && file !== "playback.json" && !/^datasets\/[a-f0-9]{24}\.json$/.test(file)) return new Response(null, { status: 404 });
  const store = blobStore(PUBLIC_STORE);
  let data = await store.get(file);
  if (!data && file === "playback.json") {
    const manifest = await readJson<MusicManifest>(store, "manifest.json");
    const saved = manifest?.files.playback;
    if (saved && /^datasets\/[a-f0-9]{24}\.json$/.test(saved)) data = await store.get(saved);
  }
  if (!data) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(request.method === "HEAD" ? null : data as BodyInit, { headers: { "Content-Type": "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff", "Cache-Control": file === "manifest.json" || file === "playback.json" ? "no-store" : "public, max-age=31536000, immutable" } });
};
export const config: Config = { path: "/api/music" };
