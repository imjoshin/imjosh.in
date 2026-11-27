import type { Listen, MusicBucket, MusicChartGranularity, MusicSongCounts, MusicSoundtrackDataset, MusicTrack, SoundtrackMetric, SoundtrackMetricData, SoundtrackSeries } from "./types.ts";
import { MUSIC_TIMEZONE, publicMusicListens } from "./aggregate.ts";
import { musicEntityKey } from "./entity-links.ts";

const metrics = ["genres", "artists", "albums"] as const;
export const MINIMUM_SOUNDTRACK_PLAYS = 11;
export const soundtrackGranularity = (period: string): MusicChartGranularity => period === "30d" ? "day" : period === "all" ? "year" : "month";
const textKey = (value: string) => value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");

function trackEntries(track: MusicTrack, metric: SoundtrackMetric) {
  const entries = metric === "genres" ? track.genres.map(name => ({ key: textKey(name), name: textKey(name), artists: [] as string[] }))
    : metric === "artists" ? track.artists.map(name => ({ key: textKey(name), name, artists: [] as string[] }))
    : track.album ? [{ key: musicEntityKey("album", track.album, track.albumArtists?.length ? track.albumArtists : track.artists), name: track.album, artists: track.albumArtists?.length ? track.albumArtists : track.artists }] : [];
  return new Map(entries.filter(item => item.key && item.name).map(item => [item.key, item]));
}

function dateKey(date: Date, formatter: Intl.DateTimeFormat) {
  const p = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
const bucketKey = (date: string, granularity: MusicChartGranularity) => date.slice(0, granularity === "day" ? 10 : granularity === "month" ? 7 : 4);
function inPeriod(date: string, timestamp: number, period: string, now: Date) {
  return period === "all" || (period === "30d" || period === "365d" ? timestamp >= now.getTime() - (period === "30d" ? 30 : 365) * 86400000 : date.startsWith(period + "-"));
}

function bucketsBetween(first: string, last: string, granularity: MusicChartGranularity): MusicBucket[] {
  const date = new Date(first + "T12:00:00Z"), end = bucketKey(last, granularity);
  if (granularity !== "day") date.setUTCDate(1);
  if (granularity === "year") date.setUTCMonth(0);
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...(granularity === "day" ? { month: "short", day: "numeric", year: "numeric" } as const : { month: "short", year: "numeric" } as const) });
  const buckets: MusicBucket[] = [];
  while (bucketKey(date.toISOString(), granularity) <= end) {
    const key = bucketKey(date.toISOString(), granularity);
    buckets.push({ key, label: granularity === "year" ? key : formatter.format(date) });
    if (granularity === "day") date.setUTCDate(date.getUTCDate() + 1);
    else if (granularity === "month") date.setUTCMonth(date.getUTCMonth() + 1);
    else date.setUTCFullYear(date.getUTCFullYear() + 1);
  }
  return buckets;
}

/** Rank each bucket independently and retain the union of its top five. */
export function aggregateSoundtrack(input: Listen[], now = new Date(), timezone = MUSIC_TIMEZONE): Record<string, MusicSoundtrackDataset> {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" });
  const listens = publicMusicListens(input, now);
  const dated = listens.map(listen => ({ listen, date: dateKey(new Date(listen.playedAt), formatter), timestamp: Date.parse(listen.playedAt) }));
  const periods = ["all", "30d", "365d", ...new Set(dated.map(row => row.date.slice(0, 4)))];
  const datasets: Record<string, MusicSoundtrackDataset> = {};
  for (const platform of ["all", ...new Set(listens.map(l => l.platform))] as const) {
    for (const period of periods) {
      const granularity = soundtrackGranularity(period);
      const minimumPlays = period === "30d" ? 1 : MINIMUM_SOUNDTRACK_PLAYS;
      const rows = dated.filter(row => (platform === "all" || row.listen.platform === platform) && inPeriod(row.date, row.timestamp, period, now));
      let buckets: MusicBucket[] = [];
      if (rows.length) {
        const dates = rows.map(row => row.date).sort();
        const first = period === "30d" || period === "365d" ? dateKey(new Date(now.getTime() - (period === "30d" ? 30 : 365) * 86400000), formatter) : period === "all" ? dates[0] : period + "-01-01";
        const last = period === "30d" || period === "365d" ? dateKey(now, formatter) : period === "all" ? dates.at(-1)! : period + "-12-31";
        buckets = bucketsBetween(first, last, granularity);
      }
      const positions = new Map(buckets.map((bucket, i) => [bucket.key, i]));
      const result = {} as Record<SoundtrackMetric, SoundtrackMetricData>;
      for (const metric of metrics) {
        const all = new Map<string, SoundtrackSeries>();
        let classifiedPlays = 0;
        for (const { listen, date } of rows) {
          const unique = trackEntries(listen.track, metric);
          if (unique.size) classifiedPlays++;
          for (const [key, item] of unique) {
            const series = all.get(key) || { ...item, plays: Array(buckets.length).fill(0) };
            series.plays[positions.get(bucketKey(date, granularity))!]++; all.set(key, series);
          }
        }
        for (const series of all.values()) series.plays = series.plays.map(plays => plays >= minimumPlays ? plays : 0);
        const selected = new Set<string>();
        for (let index = 0; index < buckets.length; index++) {
          const leaders = [...all.values()].filter(s => s.plays[index] > 0).sort((a, b) => b.plays[index] - a.plays[index] || a.key.localeCompare(b.key)).slice(0, 5);
          for (const series of leaders) selected.add(series.key);
        }
        result[metric] = { series: [...all.values()].filter(s => selected.has(s.key)).sort((a, b) => a.key.localeCompare(b.key)), classifiedPlays, unclassifiedPlays: rows.length - classifiedPlays };
      }
      datasets[`${platform}/soundtrack/${period}`] = { version: 1, generatedAt: now.toISOString(), timezone, platform, period, granularity, buckets, metrics: result, minimumPlays };
    }
  }
  return datasets;
}

/** Song counts use the same window, retaining matching plays below the chart cutoff. */
export function aggregateSoundtrackSongs(input: Listen[], datasets: Record<string, MusicSoundtrackDataset>, now = new Date(), timezone = MUSIC_TIMEZONE): Record<string, Record<SoundtrackMetric, Record<string, MusicSongCounts[]>>> {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" });
  const dated = publicMusicListens(input, now).map(listen => ({ listen, date: dateKey(new Date(listen.playedAt), formatter), timestamp: Date.parse(listen.playedAt) }));
  const result: Record<string, Record<SoundtrackMetric, Record<string, MusicSongCounts[]>>> = {};
  for (const [key, dataset] of Object.entries(datasets)) {
    result[key] = { genres: {}, artists: {}, albums: {} };
    const rows = dated.filter(row => (dataset.platform === "all" || row.listen.platform === dataset.platform) && inPeriod(row.date, row.timestamp, dataset.period, now));
    for (const metric of metrics) {
      const groups = new Map(dataset.metrics[metric].series.map(series => [series.key, new Map<string, MusicSongCounts>()]));
      for (const { listen, date } of rows) {
        for (const entry of trackEntries(listen.track, metric).keys()) {
          const songs = groups.get(entry);
          if (!songs) continue;
          const trackKey = musicEntityKey("track", listen.track.title, listen.track.artists);
          const song = songs.get(trackKey) || { key: trackKey, plays: 0, buckets: {} };
          const bucket = bucketKey(date, dataset.granularity);
          song.plays++; song.buckets[bucket] = (song.buckets[bucket] || 0) + 1; songs.set(trackKey, song);
        }
      }
      result[key][metric] = Object.fromEntries([...groups].map(([entry, songs]) => [entry, [...songs.values()].sort((a, b) => b.plays - a.plays || a.key.localeCompare(b.key))]));
    }
  }
  return result;
}
