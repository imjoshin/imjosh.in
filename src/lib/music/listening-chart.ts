import type { MusicDataset } from "./types.ts";

/** Fill calendar gaps for display without changing the recorded aggregates. */
export function listeningChartBuckets(data: MusicDataset): { key: string; plays: number }[] {
  if (data.period === "30d") return (data.stats.days || []).map(day => ({ key: day.date, plays: day.plays }));

  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: data.timezone, year: "numeric", month: "2-digit" });
  const monthKey = (date: Date) => {
    const parts = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}`;
  };
  const now = new Date(data.generatedAt), currentMonth = monthKey(now);
  const recorded = new Map(data.stats.months.map(month => [month.month, month.plays]));
  const months = [...recorded.keys()].sort();
  let first = months[0] || currentMonth, last = currentMonth;
  if (data.period === "365d") first = monthKey(new Date(now.getTime() - 365 * 86400000));
  else if (/^\d{4}$/.test(data.period)) {
    first = `${data.period}-01`;
    last = data.period === currentMonth.slice(0, 4) ? currentMonth : `${data.period}-12`;
  }

  const buckets: { key: string; plays: number }[] = [];
  const date = new Date(`${first}-01T12:00:00Z`);
  for (let key = first; key <= last; date.setUTCMonth(date.getUTCMonth() + 1), key = date.toISOString().slice(0, 7)) {
    buckets.push({ key, plays: recorded.get(key) || 0 });
  }
  return buckets;
}
