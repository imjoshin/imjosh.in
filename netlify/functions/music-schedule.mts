import type { Config } from "@netlify/functions";

export default async () => {
  if (!process.env.MUSIC_JOB_SECRET || !process.env.URL) throw new Error("Music scheduler requires MUSIC_JOB_SECRET and URL");
  const response = await fetch(new URL("/.netlify/functions/music-update-background", process.env.URL), { method: "POST", headers: { Authorization: `Bearer ${process.env.MUSIC_JOB_SECRET}` }, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Music background job was not accepted (${response.status})`);
};
// Refresh history every ten minutes; complete Spotify snapshots still refresh daily.
export const config: Config = { schedule: "*/10 * * * *" };
