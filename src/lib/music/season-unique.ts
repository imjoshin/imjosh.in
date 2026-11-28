import type { Listen, MusicSeasonUnique } from "./types.ts";
import { artistGenreKey } from "./artist-genres.ts";
import { musicSeasonAt, musicSeasons } from "./seasons.ts";

/** Receives only approved, deduplicated listens for one platform. Never publishes events. */
export function aggregateSeasonUnique(listens: Listen[], period: string, excluded: ReadonlySet<string>, now: Date, timezone: string, calendar: ReadonlyMap<string, { year: string; month: string }>): MusicSeasonUnique[] {
  const format = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit" });
  const parts = (date: Date) => {
    const values = Object.fromEntries(format.formatToParts(date).map(part => [part.type, part.value]));
    return { year: Number(values.year), month: Number(values.month) };
  };
  const today = parts(now), year = /^\d{4}$/.test(period) ? Number(period) : null;
  const seasons: MusicSeasonUnique[] = musicSeasons.map(({ key }, index) => ({
    season: key,
    status: period === "30d" ? "not_applicable" : year !== null && today.year * 12 + today.month < year * 12 + index * 3 + 3 ? "incomplete" : "ready",
    artists: [],
  }));
  if (period === "30d") return seasons;
  const counts = musicSeasons.map(() => new Map<string, { key: string; name: string; plays: number; msPlayed: number }>());
  const cutoff = period === "365d" ? now.getTime() - 365 * 86400000 : null;
  for (const listen of listens) {
    if (cutoff !== null && Date.parse(listen.playedAt) < cutoff) continue;
    const date = calendar.get(listen.id)!, bucket = musicSeasonAt(Number(date.year), Number(date.month.slice(5)));
    if ((year !== null && bucket.year !== year) || seasons[bucket.season].status !== "ready") continue;
    // Collaborations count once for each distinct credited artist, including case aliases.
    for (const [key, name] of new Map(listen.track.artists.map(name => [artistGenreKey(name), name]))) {
      if (!key || excluded.has(key)) continue;
      const artist = counts[bucket.season].get(key) || { key, name, plays: 0, msPlayed: 0 };
      artist.plays++; artist.msPlayed += listen.msPlayed || 0;
      counts[bucket.season].set(key, artist);
    }
  }
  return seasons.map((season, index) => ({ ...season, artists: [...counts[index].values()]
    .sort((a, b) => b.plays - a.plays || b.msPlayed - a.msPlayed || a.key.localeCompare(b.key))
    .slice(0, 5).map(({ key, name, plays }) => ({ key, name, plays, url: null, image: null })) }));
}
