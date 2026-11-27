import type { Listen, MusicDataset, MusicManifest, MusicPlatform, MusicStats, RankedMusic } from "./types.ts";
import { aggregationListens } from "./normalize.ts";
import { isExcludedMusic } from "./genres.ts";
import { musicEntityKey } from "./entity-links.ts";

export const MUSIC_TIMEZONE = "America/New_York";
export const publicMusicListens = (input: Listen[], now: Date) => aggregationListens(input).filter(l => l.media === "music" && !l.privateSession && !isExcludedMusic(l.track) && Date.parse(l.playedAt) <= now.getTime());
export function aggregateMusic(input: Listen[], now = new Date(), timezone = MUSIC_TIMEZONE): { manifest: MusicManifest; datasets: Record<string, MusicDataset> } {
  // Private sessions and non-music media remain in the archive, outside the public summaries.
  const listens = publicMusicListens(input, now);
  const dateFormat = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23", weekday: "short" });
  const dateParts = new Map<string, { year: string; month: string; date: string; hour: number; weekday: number }>();
  for (const l of listens) {
    const p = Object.fromEntries(dateFormat.formatToParts(new Date(l.playedAt)).map(p => [p.type, p.value]));
    dateParts.set(l.id, { year: p.year, month: `${p.year}-${p.month}`, date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour), weekday: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(p.weekday) });
  }
  const periods = ["all", "30d", "365d", ...[...new Set([...dateParts.values()].map(p => p.year))].sort().reverse()];
  const platforms = [...new Set(listens.map(l => l.platform))].sort() as MusicPlatform[];
  const generatedAt = now.toISOString();
  const dateKey = (timestamp: number) => {
    const p = Object.fromEntries(dateFormat.formatToParts(new Date(timestamp)).map(part => [part.type, part.value]));
    return `${p.year}-${p.month}-${p.day}`;
  };
  // Enumerate calendar dates in UTC after resolving the window in Eastern Time, so DST cannot skip or repeat a day.
  const dayKeys: string[] = [];
  const firstDay = Date.parse(`${dateKey(now.getTime() - 30 * 86400000)}T12:00:00Z`);
  const lastDay = Date.parse(`${dateKey(now.getTime())}T12:00:00Z`);
  for (let day = firstDay; day <= lastDay; day += 86400000) dayKeys.push(new Date(day).toISOString().slice(0, 10));
  const datasets: Record<string, MusicDataset> = {};
  const files: Record<string, string> = {};
  for (const platform of ["all", ...platforms] as const) {
    for (const period of periods) {
      const cutoff = period === "30d" ? now.getTime() - 30 * 86400000 : period === "365d" ? now.getTime() - 365 * 86400000 : null;
      const rows = listens.filter(l => (platform === "all" || l.platform === platform) && (!cutoff || Date.parse(l.playedAt) >= cutoff) && (["all", "30d", "365d"].includes(period) || dateParts.get(l.id)!.year === period) && Date.parse(l.playedAt) <= now.getTime());
      const tracks = new Map<string, RankedMusic>(), artists = new Map<string, RankedMusic>(), albums = new Map<string, RankedMusic>();
      const months = new Map<string, { month: string; plays: number; msPlayed: number }>();
      const days = new Map<string, { date: string; plays: number; msPlayed: number }>(period === "30d" && rows.length ? dayKeys.map(date => [date, { date, plays: 0, msPlayed: 0 }]) : []);
      const stats: MusicStats = { plays: rows.length, artists: 0, tracks: 0, msPlayed: 0, durationKnown: 0, genreUnknown: 0, firstListen: null, lastListen: null, topTracks: [], topArtists: [], topAlbums: [], months: [], weekdays: Array(7).fill(0), hours: Array(24).fill(0), platforms: {} };
      const add = (map: Map<string, RankedMusic>, key: string, name: string, l: Listen) => { const item = map.get(key) || { key, name, artists: l.track.artists, image: l.track.image, url: l.track.url, plays: 0, msPlayed: 0 }; item.plays++; item.msPlayed += l.msPlayed || 0; item.image ||= l.track.image; item.url ||= l.track.url; map.set(key, item); };
      for (const l of rows) {
        const p = dateParts.get(l.id)!;
        stats.msPlayed += l.msPlayed || 0;
        stats.durationKnown += Number(l.msPlayed !== null);
        stats.genreUnknown += Number(!l.track.genres.length);
        stats.firstListen ||= p.date;
        stats.lastListen = p.date;
        stats.platforms[l.platform] = (stats.platforms[l.platform] || 0) + 1;
        stats.weekdays[p.weekday]++;
        stats.hours[p.hour]++;
        add(tracks, l.track.key, l.track.title, l);
        for (const name of l.track.artists) add(artists, name.toLocaleLowerCase("en-US"), name, l);
        if (l.track.album) {
          const names = l.track.albumArtists?.length ? l.track.albumArtists : l.track.artists;
          const key = musicEntityKey("album", l.track.album, names);
          add(albums, key, l.track.album, l); albums.get(key)!.artists = names;
        }
        const month = months.get(p.month) || { month: p.month, plays: 0, msPlayed: 0 }; month.plays++; month.msPlayed += l.msPlayed || 0; months.set(p.month, month);
        const day = days.get(p.date);
        if (day) { day.plays++; day.msPlayed += l.msPlayed || 0; }
      }
      const ranked = (map: Map<string, RankedMusic>) => [...map.values()].sort((a, b) => b.plays - a.plays || b.msPlayed - a.msPlayed || a.key.localeCompare(b.key)).slice(0, 30);
      stats.artists = artists.size; stats.tracks = tracks.size; stats.topTracks = ranked(tracks); stats.topArtists = ranked(artists).map(a => ({ ...a, url: null })); stats.topAlbums = ranked(albums).map(a => ({ ...a, url: null })); stats.months = [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
      if (period === "30d") stats.days = [...days.values()];
      const key = `${platform}/${period}`;
      datasets[key] = { version: 1, generatedAt, timezone, platform, period, stats };
      files[key] = `${platform}-${period}.json`;
    }
  }
  return { manifest: { version: 1, generatedAt, timezone, periods, platforms, files, notes: ["Counts reflect available history. Gaps may exist between exports and collection.", "Listening time includes only measured duration. Track length is never substituted.", "Private sessions are excluded. Google uploader names are not treated as recording artists."] }, datasets };
}
