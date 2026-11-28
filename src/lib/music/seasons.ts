import type { MusicSeason } from "./types.ts";

export const musicSeasons: { key: MusicSeason; name: string; months: string }[] = [
  { key: "winter", name: "Winter", months: "Dec - Feb" },
  { key: "spring", name: "Spring", months: "Mar - May" },
  { key: "summer", name: "Summer", months: "Jun - Aug" },
  { key: "autumn", name: "Autumn", months: "Sep - Nov" },
];

/** Meteorological winter is December of the preceding year through February. */
export function musicSeasonAt(year: number, month: number) {
  return { year: year + Number(month === 12), season: month === 12 || month <= 2 ? 0 : month <= 5 ? 1 : month <= 8 ? 2 : 3 };
}
