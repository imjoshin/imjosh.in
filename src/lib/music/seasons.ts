import type { Listen, MusicSeason, MusicSeasonalDataset, SeasonalMetric, SeasonalMetricData, SeasonalSeries } from "./types.ts";
import { MUSIC_TIMEZONE, publicMusicListens } from "./aggregate.ts";
import { musicEntityKey } from "./entity-links.ts";

const names = ["Winter", "Spring", "Summer", "Fall"];
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

export function aggregateSeasons(input: Listen[], now = new Date(), timezone = MUSIC_TIMEZONE): Record<string, MusicSeasonalDataset> {
  const listens = publicMusicListens(input, now);
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "numeric" });
  const dated = listens.map(listen => ({ listen, season: seasonWithFormatter(new Date(listen.playedAt), formatter).index }));
  const datasets: Record<string, MusicSeasonalDataset> = {};
  for (const platform of ["all", ...new Set(listens.map(l => l.platform))] as const) {
    const rows = dated.filter(row => platform === "all" || row.listen.platform === platform);
    const bounds = rows.reduce<[number, number] | null>((value, row) => value ? [Math.min(value[0], row.season), Math.max(value[1], row.season)] : [row.season, row.season], null);
    const first = bounds?.[0] || 0;
    const seasons = bounds ? Array.from({ length: bounds[1] - first + 1 }, (_, i) => seasonAt(first + i)) : [];
    const metrics = {} as Record<SeasonalMetric, SeasonalMetricData>;
    for (const metric of ["genres", "artists", "albums"] as const) {
      const all = new Map<string, SeasonalSeries>();
      let classifiedPlays = 0;
      for (const { listen, season } of rows) {
        const track = listen.track;
        const entries = metric === "genres" ? track.genres.map(name => ({ key: textKey(name), name: textKey(name), artists: [] as string[] }))
          : metric === "artists" ? track.artists.map(name => ({ key: textKey(name), name, artists: [] as string[] }))
          : track.album ? [{ key: musicEntityKey("album", track.album, track.albumArtists?.length ? track.albumArtists : track.artists), name: track.album, artists: track.albumArtists?.length ? track.albumArtists : track.artists }] : [];
        const unique = new Map(entries.filter(item => item.key && item.name).map(item => [item.key, item]));
        if (unique.size) classifiedPlays++;
        for (const [key, item] of unique) {
          const series = all.get(key) || { ...item, plays: Array(seasons.length).fill(0) };
          series.plays[season - first]++; all.set(key, series);
        }
      }
      const selected = new Set<string>();
      // Rank independently in EVERY season, then retain the union and its complete timelines.
      for (let season = 0; season < seasons.length; season++) {
        const leaders = [...all.values()].filter(s => s.plays[season] > 0).sort((a, b) => b.plays[season] - a.plays[season] || a.key.localeCompare(b.key)).slice(0, 5);
        for (const series of leaders) selected.add(series.key);
      }
      metrics[metric] = { series: [...all.values()].filter(s => selected.has(s.key)).sort((a, b) => a.key.localeCompare(b.key)), classifiedPlays, unclassifiedPlays: rows.length - classifiedPlays };
    }
    datasets[`${platform}/seasons`] = { version: 1, generatedAt: now.toISOString(), timezone, platform, seasons, metrics };
  }
  return datasets;
}
