export const nearestChartIndex = (fraction: number, count: number) => Math.max(0, Math.min(count - 1, Math.round(fraction * (count - 1))));

/** A point can represent several lines. Keep ties together instead of choosing whichever SVG painted last. */
export function nearestChartSeries<T extends { key: string; plays: number[] }>(series: T[], index: number, value: number, tolerance: number): T[] {
  const candidates = series.filter(line => line.plays[index] > 0);
  const distance = candidates.reduce((best, line) => Math.min(best, Math.abs(line.plays[index] - value)), Infinity);
  return distance <= tolerance ? candidates.filter(line => Math.abs(Math.abs(line.plays[index] - value) - distance) < 1e-9) : [];
}
