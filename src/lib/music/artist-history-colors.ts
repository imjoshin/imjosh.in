/** Slight edge blends preserve each season's color, including low and zero counts. */
export function artistSeasonColor(plays: number, total: number): string {
  if (!plays || !total) return "transparent";
  const share = plays / total;
  const opacity = share < .01 ? 14 : share < .025 ? 27 : share < .05 ? 43 : share < .1 ? 62 : share < .2 ? 83 : 100;
  return `color-mix(in srgb,var(--acc) ${opacity}%,transparent)`;
}
