"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readMusicCollection, type MusicCollection, type MusicJsonReader } from "@/lib/music/collection";

export function useMusicCollection(initial: MusicCollection, period: string) {
  const [collection, setCollection] = useState(initial), [loading, setLoading] = useState(false), [error, setError] = useState(false), [api, setApi] = useState(false);
  const latest = useRef(initial), selection = useRef(period), priorPeriod = useRef(period);
  selection.current = period;
  const cache = useRef<Map<string, unknown> | null>(null);
  if (!cache.current) {
    cache.current = new Map();
    for (const [key, value] of [[`all/${initial.data?.period}`, initial.data], ["spotify", initial.spotify], ["all/seasons", initial.seasons]] as const) if (value && initial.manifest?.files[key]) cache.current.set(initial.manifest.files[key], value);
  }
  const controller = useRef<AbortController | null>(null), generation = useRef(0);
  const refresh = useCallback(async () => {
    const token = ++generation.current;
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    const selected = selection.current;
    const useApi = location.hostname === "imjosh.in" || location.hostname.endsWith(".netlify.app");
    setApi(useApi);
    if (!latest.current.data || latest.current.data.period !== selected) setLoading(true);
    const timeout = setTimeout(() => request.abort(), 20000);
    const read: MusicJsonReader = async <T,>(file: string, signal: AbortSignal) => {
      const response = await fetch(useApi ? `/api/music?file=${encodeURIComponent(file)}` : `/music/${file}`, { signal, cache: file === "manifest.json" ? "no-store" : "force-cache" });
      if (!response.ok) throw new Error("Music data is unavailable");
      return response.json() as Promise<T>;
    };
    try {
      const next = await readMusicCollection(read, selected, request.signal, cache.current!);
      if (token !== generation.current || selection.current !== selected) return;
      latest.current = next; setCollection(next); setError(false);
    } catch {
      if (token === generation.current && selection.current === selected) setError(true);
    } finally {
      clearTimeout(timeout);
      if (token === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const interval = setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 60000);
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    const online = () => { void refresh(); };
    document.addEventListener("visibilitychange", visible); addEventListener("online", online);
    return () => { ++generation.current; controller.current?.abort(); clearInterval(interval); document.removeEventListener("visibilitychange", visible); removeEventListener("online", online); };
  }, [refresh]);
  useEffect(() => { if (priorPeriod.current !== period) { priorPeriod.current = period; void refresh(); } }, [period, refresh]);
  return { ...collection, loading, error, api };
}
