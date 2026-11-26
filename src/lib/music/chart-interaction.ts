export const nearestChartIndex = (fraction: number, count: number) => Math.max(0, Math.min(count - 1, Math.round(fraction * (count - 1))));

export interface MusicChartPoint { t: number; x: number; y: number }
/** Interpolate by the actual month/season, preserving every vertex when period boundaries change. */
export function chartPointAt(points: MusicChartPoint[], t: number): MusicChartPoint {
  if (!points.length) return { t, x: 0, y: 0 };
  if (t <= points[0].t) return { ...points[0], t };
  for (let i = 1; i < points.length; i++) {
    if (t <= points[i].t) {
      const a = points[i - 1], b = points[i], p = (t - a.t) / (b.t - a.t);
      return { t, x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p };
    }
  }
  return { ...points.at(-1)!, t };
}
export function morphMusicLine(from: MusicChartPoint[], to: MusicChartPoint[], progress: number): MusicChartPoint[] {
  if (progress <= 0) return from;
  if (progress >= 1) return to;
  const times = [...new Set([...from, ...to].map(point => point.t))].sort((a, b) => a - b);
  return times.map(t => { const a = chartPointAt(from, t), b = chartPointAt(to, t); return { t, x: a.x + (b.x - a.x) * progress, y: a.y + (b.y - a.y) * progress }; });
}

/** A point can represent several lines. Keep ties together instead of choosing whichever SVG painted last. */
export function nearestChartSeries<T extends { key: string; plays: number[] }>(series: T[], index: number, value: number, tolerance: number): T[] {
  const candidates = series.filter(line => line.plays[index] > 0);
  const distance = candidates.reduce((best, line) => Math.min(best, Math.abs(line.plays[index] - value)), Infinity);
  return distance <= tolerance ? candidates.filter(line => Math.abs(Math.abs(line.plays[index] - value) - distance) < 1e-9) : [];
}
