import type { Listen, MusicArtistHistoryDataset, MusicHistoryArtist } from "./types.ts";
import { MUSIC_TIMEZONE, publicMusicListens } from "./aggregate.ts";
import { artistGenreKey } from "./artist-genres.ts";
import { musicSeasonAt as seasonAt, musicSeasons } from "./seasons.ts";

const seasonNames = musicSeasons.map(season => season.name);
export const RECENT_ARTIST_SEASONS = 8;
interface SeasonCounts { year: number; season: number; plays: number; artists: Map<string, number> }

/** Public all-time artist/season counts, never individual events or provider payloads. */
export function aggregateArtistHistory(input: Listen[], now = new Date(), timezone = MUSIC_TIMEZONE): MusicArtistHistoryDataset {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit" });
  const parts = (date: Date) => {
    const value = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
    return { year: Number(value.year), month: Number(value.month) };
  };
  const today = parts(now), current = seasonAt(today.year, today.month);
  const result: MusicArtistHistoryDataset = { version: 1, generatedAt: now.toISOString(), timezone, period: "all", platform: "all", startYear: null, endYear: today.year, recentSeasons: RECENT_ARTIST_SEASONS, buckets: [], groups: [] };
  const buckets = new Map<string, SeasonCounts>();
  const artists = new Map<string, { key: string; name: string; plays: number }>();
  for (const listen of publicMusicListens(input, now)) {
    const date = parts(new Date(listen.playedAt)), season = seasonAt(date.year, date.month), key = `${season.year}-${season.season}`;
    result.startYear = Math.min(result.startYear ?? date.year, date.year);
    const bucket = buckets.get(key) || { ...season, plays: 0, artists: new Map<string, number>() };
    bucket.plays++;
    // A credited artist counts once per event, including differently cased aliases.
    const credits = new Map(listen.track.artists.map(name => [artistGenreKey(name), name]));
    for (const [key, name] of credits) {
      if (!key) continue;
      const artist = artists.get(key) || { key, name, plays: 0 };
      artist.plays++;
      artists.set(key, artist);
      bucket.artists.set(key, (bucket.artists.get(key) || 0) + 1);
    }
    buckets.set(key, bucket);
  }

  const ordered: SeasonCounts[] = [];
  if (result.startYear !== null) {
    for (let year = result.startYear; year <= current.year; year++) {
      for (let season = 0; season < 4 && (year < current.year || season <= current.season); season++) {
        const key = `${year}-${season}`;
        const bucket = buckets.get(key) || { year, season, plays: 0, artists: new Map<string, number>() };
        ordered.push(bucket);
        result.buckets.push({ key, label: `${seasonNames[season]} ${year}`, plays: bucket.plays });
      }
    }
  }
  const leaders = ordered.map(bucket => new Set([...bucket.artists].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5).map(([key]) => key)));
  const recentStart = Math.max(0, ordered.length - RECENT_ARTIST_SEASONS);
  const ranked = [...artists.values()].map(artist => {
    const seasonPlays = ordered.map(bucket => bucket.artists.get(artist.key) || 0);
    let peakShare = 0, peakIndex = -1;
    seasonPlays.forEach((plays, index) => {
      const share = ordered[index].plays ? plays / ordered[index].plays : 0;
      if (share > peakShare) { peakShare = share; peakIndex = index; }
    });
    return { ...artist, seasonPlays, topSeasons: leaders.filter(set => set.has(artist.key)).length, recentTopSeasons: leaders.slice(recentStart).filter(set => set.has(artist.key)).length, recentPlays: seasonPlays.slice(recentStart).reduce((sum, count) => sum + count, 0), peakShare, peakIndex };
  });
  const tie = (a: { key: string }, b: { key: string }) => a.key.localeCompare(b.key);
  const favorites = [...ranked].sort((a, b) => b.plays - a.plays || tie(a, b)).slice(0, 10);
  const favoriteKeys = new Set(favorites.map(artist => artist.key));
  const remaining = ranked.filter(artist => !favoriteKeys.has(artist.key));
  const recent = remaining.filter(artist => artist.recentTopSeasons > 0).sort((a, b) => b.recentTopSeasons - a.recentTopSeasons || b.recentPlays - a.recentPlays || tie(a, b)).slice(0, 10);
  // Sparse exports must not turn a handful of plays into an apparent major obsession.
  const past = remaining.filter(artist => artist.topSeasons > 0 && artist.recentTopSeasons === 0 && artist.peakIndex >= 0 && ordered[artist.peakIndex].plays >= 100).sort((a, b) => b.peakShare - a.peakShare || b.plays - a.plays || tie(a, b)).slice(0, 10);
  const publicArtist = ({ key, name, plays, topSeasons, seasonPlays }: MusicHistoryArtist): MusicHistoryArtist => ({ key, name, plays, topSeasons, seasonPlays });
  result.groups = [{ key: "all-time", artists: favorites.map(publicArtist) }, { key: "recent", artists: recent.map(publicArtist) }, { key: "past", artists: past.map(publicArtist) }];
  return result;
}
