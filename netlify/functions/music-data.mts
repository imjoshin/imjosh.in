import type { Config } from "@netlify/functions";
import { blobStore, PUBLIC_STORE } from "../../scripts/music/store.ts";

export default async (request: Request) => {
  if (request.method !== "GET" && request.method !== "HEAD") return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
  const file = new URL(request.url).searchParams.get("file") || "manifest.json";
  if (file !== "manifest.json" && !/^datasets\/[a-f0-9]{24}\.json$/.test(file)) return new Response(null, { status: 404 });
  const data = await blobStore(PUBLIC_STORE).get(file);
  if (!data) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(request.method === "HEAD" ? null : data as BodyInit, { headers: { "Content-Type": "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff", "Cache-Control": file === "manifest.json" ? "public, max-age=60, stale-while-revalidate=300" : "public, max-age=31536000, immutable" } });
};
export const config: Config = { path: "/api/music" };
