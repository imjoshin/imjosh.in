import { gzipSync } from "node:zlib";
import { archive, readJson, writeJson, type MusicStore } from "./store.ts";

type Row = Record<string, any>;
export type SpotifyRequest = (path: string, optional?: boolean) => Promise<{ data: Row; rawRef: string } | null>;

/** Optional metadata must never prevent collected listening history from being published. */
export async function createSpotifyRequester(store: MusicStore, token: string, fetchedAt: string, options: { fetch?: typeof fetch; sleep?: (ms: number) => Promise<void>; now?: () => number } = {}) {
  const fetcher = options.fetch || fetch, sleep = options.sleep || (ms => new Promise(resolve => setTimeout(resolve, ms))), now = options.now || Date.now;
  const stats = { requests: 0, unavailable: [] as { endpoint: string; status: number }[] };
  let retryAt = (await readJson<{ retryAt: number }>(store, "state/spotify-rate-limit.json"))?.retryAt || 0;
  const request: SpotifyRequest = async (path, optional = false) => {
    const url = new URL(path, "https://api.spotify.com/v1/");
    if (url.origin !== "https://api.spotify.com" || !url.pathname.startsWith("/v1/")) throw new Error("Invalid Spotify pagination URL");
    if (optional && retryAt > now()) return null;
    for (let attempt = 0; attempt < 3; attempt++) {
      let res: Response;
      try {
        stats.requests++;
        res = await fetcher(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) });
      } catch (error) {
        if (attempt < 2) { await sleep(1000 * 2 ** attempt); continue; }
        if (optional) return null;
        throw error;
      }
      if (res.status === 429) {
        const header = res.headers.get("retry-after"), seconds = header === null ? NaN : Number(header);
        const delay = Math.max(1000 * 2 ** attempt, Number.isFinite(seconds) ? seconds * 1000 : Math.max(0, Date.parse(header || "") - now()) || 5000);
        retryAt = now() + delay;
        await writeJson(store, "state/spotify-rate-limit.json", { retryAt });
        // Honor long Retry-After values by deferring metadata to a later run.
        if (attempt === 2 || delay > 30000) {
          if (optional) return null;
          throw new Error("Spotify rate limit persisted. Collected pages remain archived; retry later.");
        }
        await sleep(delay); continue;
      }
      if ([403, 404].includes(res.status)) { stats.unavailable.push({ endpoint: url.pathname, status: res.status }); return null; }
      if (res.status >= 500 && attempt < 2) { await sleep(1000 * 2 ** attempt); continue; }
      if (!res.ok) {
        if (optional) { stats.unavailable.push({ endpoint: url.pathname, status: res.status }); return null; }
        throw new Error(`Spotify ${url.pathname} returned ${res.status}`);
      }
      const data = res.status === 204 ? {} : await res.json();
      const runId = fetchedAt.replace(/[:.]/g, "-");
      const rawRef = await archive(store, `spotify-${runId}-${stats.requests}.json.gz`, gzipSync(Buffer.from(JSON.stringify({ url: url.href, fetchedAt, data }))));
      return { data, rawRef };
    }
    return null;
  };
  return { request, stats };
}
