import type { Listen, MusicSongCounts, MusicSeason, MusicSeasonalDataset, MusicTrack, SeasonalMetric, SeasonalMetricData, SeasonalSeries } from "./types.ts";
import { MUSIC_TIMEZONE, publicMusicListens } from "./aggregate.ts";
import { musicEntityKey } from "./entity-links.ts";

const names = ["Winter", "Spring", "Summer", "Fall"];
const seasonalMetrics = ["genres", "artists", "albums"] as const;
export const MINIMUM_SEASONAL_PLAYS = 11;
const textKey = (value: string) => value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
const seasonAt = (index: number): MusicSeason => ({ key: `${Math.floor(index / 4)}-${names[index % 4].toLowerCase()}`, label: `${Math.floor(index / 4)} ${names[index % 4]}` });

/** December belongs to the following year's winter. Boundaries use the site's timezone. */
function seasonWithFormatter(date: Date, formatter: Intl.DateTimeFormat) {
  const parts = Object.fromEntries(formatter.formatToParts(date).map(p => [p.type, p.value]));
  const year = Number(parts.year), month = Number(parts.month);
  const index = month === 12 ? (year + 1) * 4 : year * 4 + Math.floor(month / 3);
  return { ...seasonAt(index), index };
}
export function musicSeason(date: Date, timezone = MUSIC_TIMEZONE) {
  return seasonWithFormatter(date, new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "numeric" }));
}

function trackEntries(track: MusicTrack, metric: SeasonalMetric) {
  const entries = metric === "genres" ? track.genres.map(name => ({ key: textKey(name), name: textKey(name), artists: [] as string[] }))
    : metric === "artists" ? track.artists.map(name => ({ key: textKey(name), name, artists: [] as string[] }))
    : track.album ? [{ key: musicEntityKey("album", track.album, track.albumArtists?.length ? track.albumArtists : track.artists), name: track.album, artists: track.albumArtists?.length ? track.albumArtists : track.artists }] : [];
  return new Map(entries.filter(item => item.key && item.name).map(item => [item.key, item]));
}

function rankedPeriods(rows: { listen: Listen; period: number }[], first: number, count: number): Record<SeasonalMetric, SeasonalMetricData> {
  const metrics = {} as Record<SeasonalMetric, SeasonalMetricData>;
  for (const metric of seasonalMetrics) {
    const all = new Map<string, SeasonalSeries>();
    let classifiedPlays = 0;
    for (const { listen, period } of rows) {
      const unique = trackEntries(listen.track, metric);
      if (unique.size) classifiedPlays++;
      for (const [key, item] of unique) {
        const series = all.get(key) || { ...item, plays: Array(count).fill(0) };
        series.plays[period - first]++; all.set(key, series);
      }
    }
    const selected = new Set<string>();
    for (const series of all.values()) series.plays = series.plays.map(plays => plays >= MINIMUM_SEASONAL_PLAYS ? plays : 0);
    // Rank each period independently, then retain the union of its top five.
    for (let period = 0; period < count; period++) {
      const leaders = [...all.values()].filter(s => s.plays[period] > 0).sort((a, b) => b.plays[period] - a.plays[period] || a.key.localeCompare(b.key)).slice(0, 5);
      for (const series of leaders) selected.add(series.key);
    }
    metrics[metric] = { series: [...all.values()].filter(s => selected.has(s.key)).sort((a, b) => a.key.localeCompare(b.key)), classifiedPlays, unclassifiedPlays: rows.length - classifiedPlays };
  }
  return metrics;
}

/** Song files and hover metadata cover entries selected by either granularity. */
export function soundtrackSeries(dataset: MusicSeasonalDataset, metric: SeasonalMetric): SeasonalSeries[] {
  return [...new Map([...dataset.metrics[metric].series, ...(dataset.annual?.metrics[metric].series || [])].map(line => [line.key, line])).values()];
}

export function aggregateSeasons(input: Listen[], now = new Date(), timezone = MUSIC_TIMEZONE): Record<string, MusicSeasonalDataset> {
  const listens = publicMusicListens(input, now);
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "numeric" });
  const dated = listens.map(listen => {
    const date = new Date(listen.playedAt);
    const year = Number(formatter.formatToParts(date).find(part => part.type === "year")!.value);
    return { listen, season: seasonWithFormatter(date, formatter).index, year };
  });
  const datasets: Record<string, MusicSeasonalDataset> = {};
  for (const platform of ["all", ...new Set(listens.map(l => l.platform))] as const) {
    const rows = dated.filter(row => platform === "all" || row.listen.platform === platform);
    const bounds = rows.reduce<[number, number] | null>((value, row) => value ? [Math.min(value[0], row.season), Math.max(value[1], row.season)] : [row.season, row.season], null);
    const first = bounds?.[0] || 0;
    const seasons = bounds ? Array.from({ length: bounds[1] - first + 1 }, (_, i) => seasonAt(first + i)) : [];
    const yearBounds = rows.reduce<[number, number] | null>((value, row) => value ? [Math.min(value[0], row.year), Math.max(value[1], row.year)] : [row.year, row.year], null);
    const firstYear = yearBounds?.[0] || 0;
    const years = yearBounds ? Array.from({ length: yearBounds[1] - firstYear + 1 }, (_, i) => ({ key: String(firstYear + i), label: String(firstYear + i) })) : [];
    const metrics = rankedPeriods(rows.map(row => ({ listen: row.listen, period: row.season })), first, seasons.length);
    const annual = { years, metrics: rankedPeriods(rows.map(row => ({ listen: row.listen, period: row.year })), firstYear, years.length) };
    datasets[`${platform}/seasons`] = { version: 1, generatedAt: now.toISOString(), timezone, platform, seasons, metrics, annual, minimumPlays: MINIMUM_SEASONAL_PLAYS };
  }
  return datasets;
}

/** Song lists include all approved matching plays, without the chart's volume cutoff. */
export function aggregateSeasonSongs(input: Listen[], seasonal: Record<string, MusicSeasonalDataset>, now = new Date(), timezone = MUSIC_TIMEZONE): Record<string, Record<SeasonalMetric, Record<string, MusicSongCounts[]>>> {
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "numeric" });
  const dated = publicMusicListens(input, now).map(listen => ({ listen, season: seasonWithFormatter(new Date(listen.playedAt), formatter).key, year: formatter.formatToParts(new Date(listen.playedAt)).find(part => part.type === "year")!.value }));
  const result: Record<string, Record<SeasonalMetric, Record<string, MusicSongCounts[]>>> = {};
  for (const [key, dataset] of Object.entries(seasonal)) {
    result[key] = { genres: {}, artists: {}, albums: {} };
    for (const metric of seasonalMetrics) {
      const groups = new Map(soundtrackSeries(dataset, metric).map(series => [series.key, new Map<string, MusicSongCounts>()]));
      for (const { listen, season, year } of dated) {
        if (dataset.platform !== "all" && listen.platform !== dataset.platform) continue;
        for (const entry of trackEntries(listen.track, metric).keys()) {
          const songs = groups.get(entry);
          if (!songs) continue;
          const trackKey = musicEntityKey("track", listen.track.title, listen.track.artists);
          const song = songs.get(trackKey) || { key: trackKey, plays: 0, seasons: {}, years: {} };
          song.plays++; song.seasons[season] = (song.seasons[season] || 0) + 1;
          song.years![year] = (song.years![year] || 0) + 1;
          songs.set(trackKey, song);
        }
      }
      result[key][metric] = Object.fromEntries([...groups].map(([entry, songs]) => [entry, [...songs.values()].sort((a, b) => b.plays - a.plays || a.key.localeCompare(b.key))]));
    }
  }
  return result;
}
