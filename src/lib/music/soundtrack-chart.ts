import type { SoundtrackSeries } from "./types.ts";

/** Every displayed bucket has a count, including older datasets with missing entries. */
export function soundtrackChartSeries(series: SoundtrackSeries[], bucketCount: number, minimumPlays: number): SoundtrackSeries[] {
  const total = (line: SoundtrackSeries) => line.plays.reduce((sum, plays) => sum + plays, 0);
  return series.map(line => ({
    ...line,
    plays: Array.from({ length: bucketCount }, (_, index) => {
      const plays = line.plays[index] ?? 0;
      return plays >= minimumPlays ? plays : 0;
    }),
  })).filter(line => line.plays.some(plays => plays >= minimumPlays))
    .sort((a, b) => total(b) - total(a) || a.key.localeCompare(b.key));
}
