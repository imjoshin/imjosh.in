import { timingSafeEqual } from "node:crypto";
import { blobStore, PRIVATE_STORE, PUBLIC_STORE, writeJson } from "../../scripts/music/store.ts";
import { collectSpotifyPlayback } from "../../scripts/music/playback.ts";

export default async (request: Request) => {
  const expected = process.env.MUSIC_JOB_SECRET;
  const received = request.headers.get("authorization") || "";
  if (!expected || Buffer.byteLength(received) !== Buffer.byteLength(`Bearer ${expected}`) || !timingSafeEqual(Buffer.from(received), Buffer.from(`Bearer ${expected}`))) return new Response(null, { status: 401 });
  if (request.method !== "POST") return new Response(null, { status: 405 });
  const store = blobStore(PRIVATE_STORE);
  // History publication never holds this lock. A stalled playback run cannot overlap itself.
  const release = await store.acquireLock!("state/playback-worker-lock.json", 4 * 60000);
  if (!release) return new Response(null, { status: 202 });
  try {
    const result = await collectSpotifyPlayback(store, blobStore(PUBLIC_STORE));
    await writeJson(store, "state/playback-job.json", { ok: true, completedAt: new Date().toISOString(), ...result });
  } catch (error) {
    await writeJson(store, "state/playback-job.json", { ok: false, failedAt: new Date().toISOString(), error: error instanceof Error ? error.message : "Music playback job failed" });
    throw error;
  } finally { await release(); }
  return new Response(null, { status: 202 });
};
