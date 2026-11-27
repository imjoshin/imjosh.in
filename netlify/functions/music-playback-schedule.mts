import type { Config } from "@netlify/functions";

export default async () => {
  if (!process.env.MUSIC_JOB_SECRET || !process.env.URL) throw new Error("Music scheduler requires MUSIC_JOB_SECRET and URL");
  const response = await fetch(new URL("/.netlify/functions/music-playback-background", process.env.URL), { method: "POST", headers: { Authorization: `Bearer ${process.env.MUSIC_JOB_SECRET}` }, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Music playback job was not accepted (${response.status})`);
};
export const config: Config = { schedule: "* * * * *" };
