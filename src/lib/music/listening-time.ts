import type { MusicDataset, MusicListeningTime } from "./types.ts";

const dayMs = 86400000;

/** Count Eastern calendar dates, including quiet days and partial boundary dates. */
export function listeningTimeCalendar(period: string, now: Date, firstListen: string | null, timezone: string): MusicListeningTime {
  const date = (value: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
  const today = date(now);
  const startDate = period === "30d" || period === "365d" ? date(new Date(now.getTime() - (period === "30d" ? 30 : 365) * dayMs))
    : /^\d{4}$/.test(period) ? `${period}-01-01` : firstListen || today;
  const endDate = /^\d{4}$/.test(period) && `${period}-12-31` < today ? `${period}-12-31` : today;
  const weekdayDays = Array<number>(7).fill(0);
  let days = 0;
  // Calendar arithmetic in UTC avoids skipping or repeating a date at DST boundaries.
  for (let timestamp = Date.parse(`${startDate}T12:00:00Z`); timestamp <= Date.parse(`${endDate}T12:00:00Z`); timestamp += dayMs) {
    weekdayDays[(new Date(timestamp).getUTCDay() + 6) % 7]++;
    days++;
  }
  return { startDate, endDate, days, weekdayDays, weekdaysMsPlayed: Array(7).fill(0), hoursMsPlayed: Array(24).fill(0), weekdaysDurationKnown: Array(7).fill(0), hoursDurationKnown: Array(24).fill(0) };
}

/** Unknown-duration plays are never treated as observed silence or estimated from track length. */
export function averageListeningTime(data: MusicDataset, by: "weekday" | "hour", index: number) {
  const time = data.stats.listeningTime;
  const plays = (by === "weekday" ? data.stats.weekdays : data.stats.hours)[index] || 0;
  const msPlayed = (by === "weekday" ? time?.weekdaysMsPlayed : time?.hoursMsPlayed)?.[index] ?? 0;
  const durationKnown = (by === "weekday" ? time?.weekdaysDurationKnown : time?.hoursDurationKnown)?.[index] ?? 0;
  const days = (by === "weekday" ? time?.weekdayDays[index] : time?.days) ?? 0;
  const average = time && days > 0 && data.stats.durationKnown > 0 && (!plays || durationKnown > 0) ? msPlayed / days : null;
  return { average, msPlayed, durationKnown, plays, days };
}

export function formatListeningTime(ms: number | null): string {
  if (ms === null) return "Unavailable";
  if (ms < 60000) return "0";
  if (ms < 3600000) return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(ms / 60000)} min`;
  const minutes = Math.round(ms / 60000);
  return `${Math.floor(minutes / 60)} hr${minutes % 60 ? ` ${minutes % 60} min` : ""}`;
}
