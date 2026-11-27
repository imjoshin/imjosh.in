import type { SpotifyCredentials } from "./auth.ts";
import { digest } from "../../src/lib/music/normalize.ts";
import { readJson, writeJson, type MusicStore } from "./store.ts";

interface AccessToken { token: string; expiresAt: number; grant: string }
const grantKey = (credentials: SpotifyCredentials) => digest(`${credentials.clientId}:${credentials.refreshToken}`);

/** Both workers reuse the grant, serializing only the brief refresh and token rotation. */
export async function spotifyAccessToken(store: MusicStore, options: { fetch?: typeof fetch; sleep?: (ms: number) => Promise<void>; now?: () => number } = {}) {
  const fetcher = options.fetch || fetch, now = options.now || Date.now;
  const sleep = options.sleep || (ms => new Promise(resolve => setTimeout(resolve, ms)));
  async function saved() {
    const credentials = await readJson<SpotifyCredentials>(store, "secrets/spotify.json");
    if (!credentials) throw new Error("Spotify is not connected. Run npm run music:auth -- --client-id YOUR_CLIENT_ID");
    const cached = await readJson<AccessToken>(store, "secrets/spotify-access.json");
    return { credentials, token: cached?.grant === grantKey(credentials) && cached.expiresAt > now() + 60000 ? cached.token : null };
  }
  const initial = await saved();
  if (initial.token) return initial.token;
  let release: (() => Promise<void>) | null = null;
  if (store.acquireLock) {
    for (let attempt = 0; attempt < 80; attempt++) {
      release = await store.acquireLock("state/spotify-token-lock.json", 45000);
      if (release) break;
      await sleep(500);
      const cached = await saved();
      if (cached.token) return cached.token;
    }
    if (!release) throw new Error("Spotify token refresh is already running. Retry next collection.");
  }
  try {
    const { credentials, token: cached } = await saved();
    if (cached) return cached;
    const response = await fetcher("https://accounts.spotify.com/api/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: credentials.refreshToken, client_id: credentials.clientId }), signal: AbortSignal.timeout(30000) });
    const token = await response.json();
    if (!response.ok || !token.access_token) throw new Error(`Spotify token refresh failed (${response.status}). Reconnect with music:auth.`);
    const rotated = token.refresh_token ? { ...credentials, refreshToken: token.refresh_token, refreshTokenExpiresAt: token.refresh_token_expires_in ? new Date(now() + token.refresh_token_expires_in * 1000).toISOString() : credentials.refreshTokenExpiresAt } : credentials;
    if (token.refresh_token) await writeJson(store, "secrets/spotify.json", rotated);
    await writeJson(store, "secrets/spotify-access.json", { token: token.access_token, expiresAt: now() + Number(token.expires_in || 3600) * 1000, grant: grantKey(rotated) } satisfies AccessToken);
    return token.access_token as string;
  } finally { await release?.(); }
}
