import { createServer } from "node:http";
import { randomBytes, createHash } from "node:crypto";
import { writeJson, type MusicStore } from "./store.ts";

export const SPOTIFY_SCOPES = ["user-read-recently-played", "user-top-read", "user-library-read", "user-follow-read", "playlist-read-private", "playlist-read-collaborative", "user-read-playback-state", "user-read-currently-playing"];
export interface SpotifyCredentials { clientId: string; refreshToken: string; scope: string; authorizedAt: string; refreshTokenExpiresAt: string | null }

export async function authorizeSpotify(store: MusicStore, clientId: string) {
  if (!/^[a-f0-9]{32}$/i.test(clientId)) throw new Error("Provide the Spotify app's client ID using --client-id");
  const redirectUri = "http://127.0.0.1:8888/callback/spotify";
  const verifier = randomBytes(48).toString("base64url"), state = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const authUrl = new URL("https://accounts.spotify.com/authorize");
  authUrl.search = new URLSearchParams({ client_id: clientId, response_type: "code", redirect_uri: redirectUri, scope: SPOTIFY_SCOPES.join(" "), state, code_challenge_method: "S256", code_challenge: challenge }).toString();
  await new Promise<void>((resolve, reject) => {
    const server = createServer(async (req, res) => {
      res.setHeader("Cache-Control", "no-store"); res.setHeader("Referrer-Policy", "no-referrer");
      const url = new URL(req.url || "/", "http://127.0.0.1:8888");
      if (url.pathname === "/start") { res.writeHead(302, { Location: authUrl.href }); res.end(); return; }
      if (url.pathname !== "/callback/spotify") { res.writeHead(404); res.end(); return; }
      if (url.searchParams.get("state") !== state) { res.writeHead(400); res.end("Authorization state did not match."); return; }
      try {
        if (url.searchParams.has("error")) throw new Error("Spotify authorization was declined");
        const code = url.searchParams.get("code"); if (!code) throw new Error("Missing authorization code");
        const response = await fetch("https://accounts.spotify.com/api/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: clientId, grant_type: "authorization_code", code, redirect_uri: redirectUri, code_verifier: verifier }), signal: AbortSignal.timeout(30000) });
        const data = await response.json();
        if (!response.ok || !data.refresh_token) throw new Error(`Spotify authorization failed (${response.status})`);
        await writeJson(store, "secrets/spotify.json", { clientId, refreshToken: data.refresh_token, scope: data.scope || SPOTIFY_SCOPES.join(" "), authorizedAt: new Date().toISOString(), refreshTokenExpiresAt: data.refresh_token_expires_in ? new Date(Date.now() + data.refresh_token_expires_in * 1000).toISOString() : null } satisfies SpotifyCredentials);
        res.setHeader("Content-Type", "text/html; charset=utf-8"); res.end("<!doctype html><title>Music connected</title><script>history.replaceState(null,'','/connected')</script><h1>Spotify is connected.</h1><p>Your music collector can now update automatically. You can close this tab.</p>");
        console.log("Spotify connected. Credentials saved privately; no client secret is required with PKCE.");
        server.close(); resolve();
      } catch (error) { res.writeHead(500); res.end("Could not connect Spotify. Check the collector terminal."); server.close(); reject(error); }
    });
    server.on("error", reject);
    server.listen(8888, "127.0.0.1", () => console.log("Open http://127.0.0.1:8888/start to authorize Spotify."));
    server.setTimeout(30000);
  });
}
