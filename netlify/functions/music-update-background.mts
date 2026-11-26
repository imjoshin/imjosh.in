import { timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";
import { blobStore, PRIVATE_STORE, PUBLIC_STORE, readJson, writeJson } from "../../scripts/music/store.ts";
import { collectSpotify } from "../../scripts/music/spotify.ts";
import { publishMusic } from "../../scripts/music/publish.ts";

export default async (request: Request) => {
  const expected = process.env.MUSIC_JOB_SECRET;
  const received = request.headers.get("authorization") || "";
  if (!expected || Buffer.byteLength(received) !== Buffer.byteLength(`Bearer ${expected}`) || !timingSafeEqual(Buffer.from(received), Buffer.from(`Bearer ${expected}`))) return new Response(null, { status: 401 });
  if (request.method !== "POST") return new Response(null, { status: 405 });
  const locks = getStore({ name: PRIVATE_STORE, consistency: "strong" });
  const prior = await locks.getWithMetadata("state/worker-lock.json", { type: "json" });
  if (prior && (prior.data as { expiresAt: number }).expiresAt > Date.now()) return new Response(null, { status: 202 });
  const claim = await locks.setJSON("state/worker-lock.json", { expiresAt: Date.now() + 16 * 60000 }, prior?.etag ? { onlyIfMatch: prior.etag } : { onlyIfNew: true });
  if (!claim.modified) return new Response(null, { status: 202 });
  const store = blobStore(PRIVATE_STORE);
  try {
    const last = await readJson<{ fetchedAt: string }>(store, "state/spotify-full.json");
    await collectSpotify(store, !last || last.fetchedAt.slice(0, 10) !== new Date().toISOString().slice(0, 10), 200);
    const result = await publishMusic(store, blobStore(PUBLIC_STORE));
    await writeJson(store, "state/job.json", { ok: true, completedAt: new Date().toISOString(), listens: result.listens, datasets: result.datasets });
  } catch (error) {
    await writeJson(store, "state/job.json", { ok: false, failedAt: new Date().toISOString(), error: error instanceof Error ? error.message : "Music job failed" });
    throw error;
  } finally {
    // Conditional release prevents an expired worker from releasing a newer worker's lock.
    if (claim.etag) await locks.setJSON("state/worker-lock.json", { expiresAt: 0 }, { onlyIfMatch: claim.etag });
  }
  return new Response(null, { status: 202 });
};
