"use client";

import { useEffect, useState } from "react";
import { readMusicPlayback, type MusicJsonReader } from "@/lib/music/collection";
import type { MusicPlaybackSnapshot } from "@/lib/music/types";

export function useMusicPlayback() {
  const [playback, setPlayback] = useState<MusicPlaybackSnapshot | null>(null);
  useEffect(() => {
    let generation = 0;
    let controller: AbortController | null = null;
    const useApi = location.hostname === "imjosh.in" || location.hostname.endsWith(".netlify.app");
    const read: MusicJsonReader = async <T,>(file: string, signal: AbortSignal) => {
      const response = await fetch(useApi ? `/api/music?file=${encodeURIComponent(file)}` : `/music/${file}`, { signal, cache: "no-store" });
      if (!response.ok) throw new Error("Music playback is unavailable");
      return response.json() as Promise<T>;
    };
    const refresh = async () => {
      const current = ++generation;
      controller?.abort();
      const request = new AbortController(); controller = request;
      const timeout = setTimeout(() => request.abort(), 20000);
      try {
        const next = await readMusicPlayback(read, request.signal);
        if (current === generation) setPlayback(next);
      } catch { /* Keep the last confirmed playback when the update is unavailable. */ }
      finally { clearTimeout(timeout); }
    };
    void refresh();
    const interval = setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 20000);
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    const online = () => { void refresh(); };
    document.addEventListener("visibilitychange", visible); addEventListener("online", online);
    return () => { ++generation; controller?.abort(); clearInterval(interval); document.removeEventListener("visibilitychange", visible); removeEventListener("online", online); };
  }, []);
  return playback;
}
