import { gzipSync } from "node:zlib";
import { archive, readJson, writeJson, saveListens, type MusicStore } from "./store.ts";
import type { SpotifyCredentials } from "./auth.ts";
import { spotifyListen, clean } from "../../src/lib/music/normalize.ts";
import { isKidsGenre } from "../../src/lib/music/genres.ts";
import type { RankedMusic, SpotifySnapshot } from "../../src/lib/music/types.ts";

type Row = Record<string, any>;
export interface GenreEntry { genres: string[]; provider: string; fetchedAt: string; artistId: string | null }
export type GenreIndex = Record<string, GenreEntry>;

export async function collectSpotify(store: MusicStore, full = false, genreBudget = 10000, backfill = false) {
  const credentials = await readJson<SpotifyCredentials>(store, "secrets/spotify.json");
  if (!credentials) throw new Error("Spotify is not connected. Run npm run music:auth -- --client-id YOUR_CLIENT_ID");
  const response = await fetch("https://accounts.spotify.com/api/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: credentials.refreshToken, client_id: credentials.clientId }), signal: AbortSignal.timeout(30000) });
  const token = await response.json();
  if (!response.ok || !token.access_token) throw new Error(`Spotify token refresh failed (${response.status}). Reconnect with music:auth.`);
  if (token.refresh_token) await writeJson(store, "secrets/spotify.json", { ...credentials, refreshToken: token.refresh_token, refreshTokenExpiresAt: token.refresh_token_expires_in ? new Date(Date.now() + token.refresh_token_expires_in * 1000).toISOString() : credentials.refreshTokenExpiresAt });
  const fetchedAt = new Date().toISOString(), runId = fetchedAt.replace(/[:.]/g, "-");
  const genreIndex = await readJson<GenreIndex>(store, "catalog/genres.json") || {};
  const artists = new Map<string, Row>();
  const tracks = new Map<string, Row>();
  const unavailable: { endpoint: string; status: number }[] = [];
  let requests = 0;
  async function request(path: string): Promise<{ data: Row; rawRef: string } | null> {
    const url = new URL(path, "https://api.spotify.com/v1/");
    if (url.origin !== "https://api.spotify.com" || !url.pathname.startsWith("/v1/")) throw new Error("Invalid Spotify pagination URL");
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token.access_token}` }, signal: AbortSignal.timeout(30000) }); requests++;
      if (res.status === 429) { const wait = Math.min(Number(res.headers.get("retry-after") || 5), 45); await new Promise(r => setTimeout(r, wait * 1000)); continue; }
      if ([403, 404].includes(res.status)) { unavailable.push({ endpoint: url.pathname, status: res.status }); return null; }
      if (!res.ok) throw new Error(`Spotify ${url.pathname} returned ${res.status}`);
      const data = res.status === 204 ? {} : await res.json();
      const rawRef = await archive(store, `spotify-${runId}-${requests}.json.gz`, gzipSync(Buffer.from(JSON.stringify({ url: url.href, fetchedAt, data }))));
      return { data, rawRef };
    }
    throw new Error("Spotify rate limit persisted. Collected pages remain archived; retry later.");
  }
  function remember(t: Row) {
    if (!t?.id) return; tracks.set(t.id, t);
    for (const artist of t.artists || []) if (artist.id) artists.set(artist.id, { ...artists.get(artist.id), ...artist });
  }
  async function pages(path: string, nested?: string): Promise<Row[]> {
    const rows: Row[] = []; let next: string | null = path;
    const visited = new Set<string>();
    while (next) { if (visited.has(next)) throw new Error("Spotify pagination repeated a page"); visited.add(next); const page = await request(next); if (!page) break; const value = nested ? page.data[nested] : page.data; const items = value?.items || []; rows.push(...items); next = value?.next || null; }
    return rows;
  }
  const playback = await request("me/player");
  await writeJson(store, "state/spotify-playback.json", { checkedAt: new Date().toISOString(), data: playback?.data || null });
  if (playback?.data.item) remember(playback.data.item);
  const last = await readJson<{ latest: string | null }>(store, "state/spotify-recent.json");
  let recentPath: string | null = "me/player/recently-played?limit=50", latest: string | null = null, oldest: string | null = null, returned = 0;
  const seenRecent = new Set<string>();
  while (recentPath) {
    const recent = await request(recentPath); if (!recent) break;
    const rows: Row[] = recent.data.items || [];
    const normalized = rows.map(row => spotifyListen(row, recent.rawRef)).filter((l): l is NonNullable<typeof l> => !!l);
    const fresh = normalized.filter(l => !seenRecent.has(l.id)); if (!fresh.length) break;
    for (const row of rows) remember(row.track);
    for (const l of fresh) seenRecent.add(l.id);
    await saveListens(store, fresh); returned += fresh.length;
    latest ||= rows[0]?.played_at || null; oldest = rows.at(-1)?.played_at || null;
    if (!oldest || rows.length < 50 || (!full && !backfill && last?.latest && oldest <= last.latest)) break;
    // Explicitly walk backwards; the response's `next` cursor can instead point to newer plays.
    recentPath = `me/player/recently-played?limit=50&before=${Date.parse(oldest)}`;
  }
  await writeJson(store, `state/history/${runId}.json`, { fetchedAt, returned, possibleGap: !!last?.latest && !!oldest && returned >= 50 && oldest > last.latest });
  await writeJson(store, "state/spotify-recent.json", { latest: latest || last?.latest || null, fetchedAt });
  let snapshot: SpotifySnapshot | null = null;
  if (full) {
    snapshot = { generatedAt: fetchedAt, ranges: {}, playlists: [] };
    for (const endpoint of ["me", "me/player/currently-playing", "me/player/devices", "me/player/queue"]) {
      const result = await request(endpoint);
      if (result) { remember(result.data.item || result.data.currently_playing); for (const t of result.data.queue || []) remember(t); }
    }
    for (const range of ["short_term", "medium_term", "long_term"]) {
      const topTracks = await pages(`me/top/tracks?limit=50&time_range=${range}`);
      const topArtists = await pages(`me/top/artists?limit=50&time_range=${range}`);
      for (const t of topTracks) remember(t);
      for (const a of topArtists) if (a.id) artists.set(a.id, a);
      // Keep the complete provider rankings privately; filter only when publishing below.
      await writeJson(store, `snapshots/spotify/${range}.json`, { fetchedAt, tracks: topTracks, artists: topArtists });
    }
    for (const endpoint of ["me/tracks?limit=50", "me/albums?limit=50", "me/shows?limit=50", "me/episodes?limit=50", "me/audiobooks?limit=50", "me/following?type=artist&limit=50"]) {
      const rows = await pages(endpoint, endpoint.includes("following") ? "artists" : undefined);
      for (const row of rows) {
        if (row.track) remember(row.track);
        if (row.album?.tracks) {
          const album = { ...row.album, tracks: undefined };
          for (const t of row.album.tracks.items || []) remember({ ...t, album });
          if (row.album.tracks.next) for (const t of await pages(row.album.tracks.next)) remember({ ...t, album });
        }
      }
      await writeJson(store, `snapshots/spotify/${endpoint.split("?")[0].replaceAll("/", "-")}.json.gz`, { fetchedAt, items: rows });
    }
    const playlists = await pages("me/playlists?limit=50");
    for (const p of playlists) {
      if (!p.id) continue;
      const items = await pages(`playlists/${encodeURIComponent(p.id)}/items?limit=50`);
      for (const item of items) remember(item.item || item.track);
      await writeJson(store, `snapshots/spotify/playlists/${p.id}.json.gz`, { fetchedAt, playlist: p, items });
      // Only playlists already public are exposed on the website.
      if (p.public === true) snapshot.playlists.push({ id: p.id, name: clean(p.name), image: p.images?.[0]?.url || null, url: p.external_urls?.spotify || `https://open.spotify.com/playlist/${p.id}`, tracks: p.items?.total ?? p.tracks?.total ?? items.length });
    }
  }
  let genreRequests = 0;
  for (const [id, artist] of artists) {
    const name = clean(artist.name).toLowerCase();
    const previous = genreIndex[name];
    if (Array.isArray(artist.genres)) genreIndex[name] = { genres: artist.genres, provider: "spotify-artist", artistId: id, fetchedAt };
    else if ((!previous || Date.parse(previous.fetchedAt) < Date.now() - 30 * 86400000) && genreRequests < genreBudget) {
      genreRequests++;
      const detail = await request(`artists/${id}`);
      if (detail) genreIndex[name] = { genres: detail.data.genres || [], provider: "spotify-artist", artistId: id, fetchedAt };
      if (genreRequests % 50 === 0) await writeJson(store, "catalog/genres.json", genreIndex);
    }
  }
  await writeJson(store, "catalog/genres.json", genreIndex);
  await writeJson(store, "catalog/spotify-tracks.json.gz", { ...(await readJson<Record<string, Row>>(store, "catalog/spotify-tracks.json.gz") || {}), ...Object.fromEntries(tracks) });
  if (snapshot) {
    const ranked = (item: Row, artist = false): RankedMusic => ({ key: item.id, name: clean(item.name), artists: artist ? [] : (item.artists || []).map((a: Row) => clean(a.name)), image: (artist ? item.images : item.album?.images)?.[0]?.url || null, url: item.external_urls?.spotify || null, plays: 0, msPlayed: 0 });
    const isKids = (item: Row, artist = false) => (artist ? item.genres || genreIndex[clean(item.name).toLowerCase()]?.genres || [] : [...(item.genres || []), ...(item.album?.genres || []), ...(item.artists || []).flatMap((a: Row) => genreIndex[clean(a.name).toLowerCase()]?.genres || [])]).some(isKidsGenre);
    const publicPlaylists = [];
    for (const playlist of snapshot.playlists) {
      const raw = await readJson<{ items: Row[] }>(store, `snapshots/spotify/playlists/${playlist.id}.json.gz`);
      const items = (raw?.items || []).map(row => row.item || row.track).filter(Boolean).filter(item => !isKids(item));
      if (items.length) publicPlaylists.push({ ...playlist, tracks: items.length });
    }
    snapshot.playlists = publicPlaylists;
    for (const range of ["short_term", "medium_term", "long_term"]) { const raw = await readJson<{ tracks: Row[]; artists: Row[] }>(store, `snapshots/spotify/${range}.json`); snapshot.ranges[range] = { tracks: (raw?.tracks || []).filter(t => !isKids(t)).slice(0, 12).map(t => ranked(t)), artists: (raw?.artists || []).filter(a => !isKids(a, true)).slice(0, 12).map(a => ranked(a, true)) }; }
    await writeJson(store, "public/spotify.json", snapshot);
  }
  await writeJson(store, "state/spotify.json", { fetchedAt, full, requests, unavailable });
  if (full) await writeJson(store, "state/spotify-full.json", { fetchedAt });
  return { requests, tracks: tracks.size, artists: artists.size, unavailable: unavailable.length };
}
