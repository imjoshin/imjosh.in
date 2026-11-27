/** Approximate calendar range supplied by Josh; May is the exclusive end. */
export const googlePlayMusicGap = {
  start: Date.UTC(2014, 10, 1),
  end: Date.UTC(2020, 4, 1),
  label: "Around Nov 2014 - Apr 2020",
  description: "Google Play Music history is missing for this period. I’m working on adding it. Recorded plays from other sources are still shown.",
};

export interface MusicHistoryGapRange { start: number; end: number; startsHere: boolean; endsHere: boolean }

/** Calendar intervals shared by daily, monthly, yearly, and Eastern season labels. */
function bucketInterval(key: string): [number, number] {
  if (/^\d{4}-[0-3]$/.test(key)) {
    const [year, season] = key.split("-").map(Number);
    return [Date.UTC(year, season * 3 - 1, 1), Date.UTC(year, season * 3 + 2, 1)];
  }
  const [year, month = 1, day = 1] = key.split("-").map(Number);
  const start = Date.UTC(year, month - 1, day);
  return [start, key.length === 4 ? Date.UTC(year + 1, 0, 1) : key.length === 7 ? Date.UTC(year, month, 1) : Date.UTC(year, month - 1, day + 1)];
}

export function hasMissingMusicHistory(key: string): boolean {
  const [start, end] = bucketInterval(key);
  return start < googlePlayMusicGap.end && end > googlePlayMusicGap.start;
}

/** Project into the chart's existing bucket spacing, clipping to its visible range. */
export function musicHistoryGap(keys: string[], layout: "points" | "cells" = "points"): MusicHistoryGapRange | null {
  if (!keys.length) return null;
  const intervals = keys.map(bucketInterval);
  const position = (time: number) => {
    if (time <= intervals[0][0]) return 0;
    for (let i = 0; i < intervals.length; i++) {
      const [start, end] = intervals[i];
      if (time < end) return i + (time - start) / (end - start);
    }
    return intervals.length;
  };
  const cells = layout === "cells" || keys.length === 1;
  const origin = cells ? 0 : .5, width = cells ? keys.length : keys.length - 1;
  const start = (position(googlePlayMusicGap.start) - origin) / width;
  const end = (position(googlePlayMusicGap.end) - origin) / width;
  if (end <= 0 || start >= 1 || start === end) return null;
  return { start: Math.max(0, start), end: Math.min(1, end), startsHere: start >= 0 && googlePlayMusicGap.start >= intervals[0][0], endsHere: end <= 1 && googlePlayMusicGap.end <= intervals.at(-1)![1] };
}
