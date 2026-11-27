export const nearestChartIndex = (fraction: number, count: number) => Math.max(0, Math.min(count - 1, Math.round(fraction * (count - 1))));

export interface MusicChartPoint { t: number; x: number; y: number }

/** Light, shape-preserving curves through the observations, with separate paths across missing buckets. */
export function musicLinePath(points: MusicChartPoint[], defined?: (point: MusicChartPoint) => boolean): string {
  const paths: string[] = [];
  let segment: MusicChartPoint[] = [];
  const flush = () => {
    if (!segment.length) return;
    const slopes = segment.slice(1).map((point, i) => (point.y - segment[i].y) / (point.x - segment[i].x));
    const tangents = segment.map((_, i) => {
      if (i === 0) return slopes[0] || 0;
      if (i === segment.length - 1) return slopes[i - 1] || 0;
      const before = slopes[i - 1], after = slopes[i];
      // A horizontal tangent at a turning point keeps peaks and zeroes from overshooting.
      return before * after > 0 ? 2 / (1 / before + 1 / after) : 0;
    });
    paths.push(`M ${segment[0].x} ${segment[0].y}`);
    for (let i = 1; i < segment.length; i++) {
      const a = segment[i - 1], b = segment[i];
      if (segment.length === 2) paths.push(`L ${b.x} ${b.y}`);
      else {
        const handle = (b.x - a.x) * .24;
        paths.push(`C ${a.x + handle} ${a.y + handle * tangents[i - 1]} ${b.x - handle} ${b.y - handle * tangents[i]} ${b.x} ${b.y}`);
      }
    }
    segment = [];
  };
  for (const point of points) {
    if (defined && !defined(point)) { flush(); continue; }
    // Collapsed vertices can occur while a period transition changes the plot's width.
    if (segment.length && point.x <= segment.at(-1)!.x) flush();
    segment.push(point);
  }
  flush();
  return paths.join(" ");
}

/** Interpolate by the bucket's date, preserving every vertex when period boundaries change. */
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
