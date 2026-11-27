import { digest, spotifyListen } from "../../src/lib/music/normalize.ts";
import { MUSIC_TIMEZONE } from "../../src/lib/music/aggregate.ts";
import { sixMonthsAgo } from "../../src/lib/music/recommendations.ts";
import type { Listen } from "../../src/lib/music/types.ts";

export interface SpotifyRecentPage {
  checkedAt: string;
  rawRef: string;
  data: Record<string, any>;
}

/** Hash event identities, including timestamps, rather than mutable provider metadata. */
export function spotifyHistoryFingerprint(data: unknown): string | null {
  if (!data || typeof data !== "object" || !Array.isArray((data as { items?: unknown }).items)) return null;
  const ids = new Set<string>();
  for (const row of (data as { items: unknown[] }).items) {
    if (!row || typeof row !== "object") return null;
    const item = row as Record<string, any>;
    if (typeof item.played_at !== "string" || !item.track || typeof item.track !== "object" || !Array.isArray(item.track.artists)) return null;
    if (item.track.artists.some((artist: unknown) => !artist || typeof artist !== "object" || typeof (artist as { name?: unknown }).name !== "string")) return null;
    const listen = spotifyListen(item, "fingerprint");
    if (!listen) return null;
    ids.add(listen.id);
  }
  return digest(JSON.stringify([...ids].sort()));
}

/** Wake for calendar/window changes even if Spotify has no new plays. */
export function nextHistoryRefreshAt(rows: Listen[], now: Date): string {
  const timestamp = now.getTime();
  const dates = new Intl.DateTimeFormat("en-CA", { timeZone: MUSIC_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" });
  const today = dates.format(now);
  let low = timestamp, high = timestamp + 27 * 3600000;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (dates.format(new Date(middle)) === today) low = middle; else high = middle;
  }
  let next = high;
  const cutoff = sixMonthsAgo(now);
  let oldestRecent = Infinity;
  for (const row of rows) {
    const played = Date.parse(row.playedAt);
    if (!Number.isFinite(played)) continue;
    if (played > timestamp) next = Math.min(next, played);
    for (const days of [30, 365]) {
      const expires = played + days * 86400000 + 1;
      if (expires > timestamp) next = Math.min(next, expires);
    }
    if (played >= cutoff && played <= timestamp) oldestRecent = Math.min(oldestRecent, played);
  }
  // Calendar-month cutoffs can move backwards at a DST fold. Search each UTC-hour
  // segment and wake at backwards jumps, when previously excluded plays can re-enter.
  let previousCutoff = cutoff;
  for (let begin = timestamp + 1; begin < next;) {
    const end = Math.min(next - 1, (Math.floor(begin / 3600000) + 1) * 3600000 - 1);
    const firstCutoff = sixMonthsAgo(new Date(begin));
    if ((rows.length > 0 && firstCutoff < previousCutoff) || firstCutoff > oldestRecent) return new Date(begin).toISOString();
    const lastCutoff = sixMonthsAgo(new Date(end));
    if (lastCutoff > oldestRecent) {
      low = begin; high = end;
      while (high - low > 1) {
        const middle = Math.floor((low + high) / 2);
        if (sixMonthsAgo(new Date(middle)) <= oldestRecent) low = middle; else high = middle;
      }
      return new Date(high).toISOString();
    }
    previousCutoff = lastCutoff;
    begin = end + 1;
  }
  return new Date(next).toISOString();
}
