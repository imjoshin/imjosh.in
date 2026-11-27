import savedArtistGenres from "../../content/artist_genres.json" with { type: "json" };
import { digest } from "../../src/lib/music/normalize.ts";
import type { MusicManifest } from "../../src/lib/music/types.ts";
import { HISTORY_INPUT_REVISION_FILE, readJson, writeJson, type MusicStore } from "./store.ts";
import { spotifyAccessToken } from "./spotify-token.ts";
import { createSpotifyRequester } from "./spotify-request.ts";
import { collectSpotify } from "./spotify.ts";
import { publishMusic } from "./publish.ts";
import { spotifyHistoryFingerprint, type SpotifyRecentPage } from "./history-fingerprint.ts";

export const HISTORY_FINGERPRINT_FILE = "state/fingerprint.json";
export const RECENT_HISTORY_MAX_AGE_MS = 90000;
const publicationRevision = digest(JSON.stringify({ version: 1, deploy: process.env.DEPLOY_ID || null, genres: savedArtistGenres }));

interface HistoryFingerprint {
  version: 1;
  history: string;
  observedAt: string;
  publishedAt: string;
  manifest: string;
  inputs: string | null;
  publicationRevision: string;
  nextRefreshAt: string;
  listens: number;
  datasets: number;
}

interface HistoryJobOptions {
  now?: () => Date;
  fetch?: typeof fetch;
  collect?: typeof collectSpotify;
  publish?: typeof publishMusic;
}

async function historyHead(store: MusicStore, now: Date, previous: HistoryFingerprint | null, options: HistoryJobOptions): Promise<SpotifyRecentPage> {
  const cached = await readJson<SpotifyRecentPage>(store, "state/spotify-last-tracks.json");
  const checked = Date.parse(cached?.checkedAt || "");
  if (cached && checked <= now.getTime() && checked >= now.getTime() - RECENT_HISTORY_MAX_AGE_MS &&
    checked >= Date.parse(previous?.observedAt || "1970-01-01T00:00:00Z") &&
    typeof cached.rawRef === "string" && cached.rawRef.startsWith("raw/") && spotifyHistoryFingerprint(cached.data)) return cached;

  const token = await spotifyAccessToken(store, { fetch: options.fetch });
  const { request } = await createSpotifyRequester(store, token, now.toISOString(), { fetch: options.fetch });
  const recent = await request("me/player/recently-played?limit=50");
  if (!recent || !spotifyHistoryFingerprint(recent.data)) throw new Error("Spotify recent history is unavailable or invalid; retaining the last successful fingerprint.");
  const page = { ...recent, checkedAt: now.toISOString() };
  await writeJson(store, "state/spotify-last-tracks.json", page);
  return page;
}

/** The existing history-worker lock covers the check, publication, and checkpoint. */
export async function runMusicHistoryJob(privateStore: MusicStore, publicStore: MusicStore, options: HistoryJobOptions = {}) {
  const now = options.now || (() => new Date());
  const started = now();
  const [previous, fullSync, lastJob, manifest, inputs] = await Promise.all([
    readJson<HistoryFingerprint>(privateStore, HISTORY_FINGERPRINT_FILE),
    readJson<{ fetchedAt: string }>(privateStore, "state/spotify-full.json"),
    readJson<{ ok: boolean }>(privateStore, "state/job.json"),
    readJson<MusicManifest>(publicStore, "manifest.json"),
    readJson<{ revision: string }>(privateStore, HISTORY_INPUT_REVISION_FILE),
  ]);
  const full = fullSync?.fetchedAt?.slice(0, 10) !== started.toISOString().slice(0, 10);
  const head = await historyHead(privateStore, started, previous, options);
  const history = spotifyHistoryFingerprint(head.data)!;
  const unchanged = !full && lastJob?.ok !== false && previous?.version === 1 && previous.history === history &&
    previous.inputs === (inputs?.revision || null) && previous.publicationRevision === publicationRevision &&
    !!manifest && previous.manifest === digest(JSON.stringify(manifest)) &&
    Date.parse(previous.publishedAt) <= started.getTime() && Date.parse(previous.nextRefreshAt) > started.getTime();
  if (unchanged) {
    const result = { ok: true, skipped: true, reason: "unchanged_history", checkedAt: started.toISOString(), completedAt: now().toISOString(), lastPublishedAt: previous.publishedAt, listens: previous.listens, datasets: previous.datasets };
    await writeJson(privateStore, "state/job.json", result);
    return result;
  }

  await (options.collect || collectSpotify)(privateStore, full, 200, false, { playback: false, fetch: options.fetch, recentPage: head });
  // Capture before publication; a concurrent input change must invalidate the next check.
  const publicationInputs = await readJson<{ revision: string }>(privateStore, HISTORY_INPUT_REVISION_FILE);
  const published = await (options.publish || publishMusic)(privateStore, publicStore, now());
  const checkpoint: HistoryFingerprint = {
    version: 1, history, observedAt: head.checkedAt, publishedAt: published.manifest.generatedAt,
    manifest: digest(JSON.stringify(published.manifest)), inputs: publicationInputs?.revision || null,
    publicationRevision, nextRefreshAt: published.nextRefreshAt, listens: published.listens, datasets: published.datasets,
  };
  await writeJson(privateStore, HISTORY_FINGERPRINT_FILE, checkpoint);
  const result = { ok: true, skipped: false, completedAt: now().toISOString(), listens: published.listens, datasets: published.datasets };
  await writeJson(privateStore, "state/job.json", result);
  return result;
}
