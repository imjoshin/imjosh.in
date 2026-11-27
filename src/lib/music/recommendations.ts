import type { Listen, MusicRecommendationsDataset, RankedMusic } from "./types.ts";
import { MUSIC_TIMEZONE, publicMusicListens } from "./aggregate.ts";
import { artistGenreKey } from "./artist-genres.ts";
import { musicEntityKey } from "./entity-links.ts";

/** Six calendar months at the same local time, clamping short months and honoring DST. */
export function sixMonthsAgo(now: Date, timezone = MUSIC_TIMEZONE): number {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  const localTime = (date: Date) => {
    const p = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second, date.getUTCMilliseconds());
  };
  const local = new Date(localTime(now)), day = local.getUTCDate();
  local.setUTCDate(1); local.setUTCMonth(local.getUTCMonth() - 6);
  const lastDay = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 0)).getUTCDate();
  local.setUTCDate(Math.min(day, lastDay));
  const target = local.getTime();
  let timestamp = target;
  for (let i = 0; i < 3; i++) timestamp += target - localTime(new Date(timestamp));
  return timestamp;
}

const rank = (a: RankedMusic, b: RankedMusic) => b.plays - a.plays || a.key.localeCompare(b.key);

/** Each recent artist's lifetime favorite, then two distinct favorites from the last six months. */
export function aggregateRecommendations(input: Listen[], now = new Date(), timezone = MUSIC_TIMEZONE): MusicRecommendationsDataset {
  const listens = publicMusicListens(input, now), cutoff = sixMonthsAgo(now, timezone);
  const artists = new Map<string, RankedMusic>();
  const recentCounts = new Map<string, { plays: number; msPlayed: number }>();
  for (const listen of listens) {
    if (Date.parse(listen.playedAt) < cutoff) continue;
    const trackKey = musicEntityKey("track", listen.track.title, listen.track.artists);
    const count = recentCounts.get(trackKey) || { plays: 0, msPlayed: 0 };
    count.plays++; count.msPlayed += listen.msPlayed || 0; recentCounts.set(trackKey, count);
    for (const [key, name] of new Map(listen.track.artists.map(name => [artistGenreKey(name), name]))) {
      if (!key) continue;
      const artist = artists.get(key) || { key, name, artists: [], image: null, url: null, plays: 0, msPlayed: 0 };
      artist.plays++; artist.msPlayed += listen.msPlayed || 0; artists.set(key, artist);
    }
  }
  const leaders = [...artists.values()].sort(rank).slice(0, 5);
  const songs = new Map(leaders.map(artist => [artist.key, new Map<string, RankedMusic>()]));
  for (const listen of listens) {
    for (const artist of new Set(listen.track.artists.map(artistGenreKey))) {
      const tracks = songs.get(artist);
      if (!tracks) continue;
      const key = musicEntityKey("track", listen.track.title, listen.track.artists);
      const track = tracks.get(key) || { key, name: listen.track.title, artists: listen.track.artists, image: null, url: null, plays: 0, msPlayed: 0 };
      track.plays++; track.msPlayed += listen.msPlayed || 0;
      track.image ||= listen.track.image; track.url ||= listen.track.url; tracks.set(key, track);
    }
  }
  return { version: 1, generatedAt: now.toISOString(), timezone, period: "6m", platform: "all", artists: leaders.map(artist => {
    const tracks = [...songs.get(artist.key)!.values()].sort(rank), lifetime = tracks[0];
    const recent = tracks.filter(track => track.key !== lifetime?.key && recentCounts.has(track.key)).map(track => ({ ...track, ...recentCounts.get(track.key)! })).sort(rank).slice(0, 2);
    return { ...artist, tracks: [...(lifetime ? [{ ...lifetime, period: "all" as const }] : []), ...recent.map(track => ({ ...track, period: "6m" as const }))] };
  }) };
}
