"use client";

import { useEffect, useRef, useState } from "react";
import type { MusicGenreSongsDataset } from "@/lib/music/types";
import { MusicArtists, MusicLink } from "./music-entity-link";

const number = (value: number) => new Intl.NumberFormat("en-US").format(value);
export interface GenreSongSelection { genre: string; season: string | null }

export function MusicGenreSongs({ selection, file, api, seasonLabel, close }: { selection: GenreSongSelection; file?: string; api: boolean; seasonLabel?: string; close: () => void }) {
  const [loaded, setLoaded] = useState<{ file: string; data: MusicGenreSongsDataset } | null>(null);
  const [failed, setFailed] = useState(false);
  const cache = useRef(new Map<string, MusicGenreSongsDataset>());
  const scroller = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    setFailed(false);
    if (!file) return;
    if (!/^datasets\/[a-f0-9]{24}\.json$/.test(file)) { setFailed(true); return; }
    const saved = cache.current.get(file);
    if (saved) { setLoaded({ file, data: saved }); return; }
    const request = new AbortController();
    let cancelled = false;
    const timeout = setTimeout(() => request.abort(), 20000);
    fetch(api ? `/api/music?file=${encodeURIComponent(file)}` : `/music/${file}`, { signal: request.signal, cache: "force-cache" })
      .then(async response => {
        if (!response.ok) throw new Error("Song details unavailable");
        const data = await response.json() as MusicGenreSongsDataset;
        if (data.version !== 1 || !Array.isArray(data.tracks) || !data.entities || data.genre !== selection.genre) throw new Error("Invalid song details");
        if (request.signal.aborted) return;
        cache.current.set(file, data);
        while (cache.current.size > 8) cache.current.delete(cache.current.keys().next().value!);
        setLoaded({ file, data });
      }).catch(() => { if (!cancelled) setFailed(true); })
      .finally(() => clearTimeout(timeout));
    return () => { cancelled = true; request.abort(); clearTimeout(timeout); };
  }, [file, api, selection.genre]);
  useEffect(() => { scroller.current?.scrollTo({ top: 0 }); }, [selection.genre, selection.season]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const header = document.querySelector(".site-header")?.getBoundingClientRect();
      const filters = document.querySelector(".music-history-filters")?.getBoundingClientRect();
      const covered = Math.max(header?.bottom || 0, filters && filters.top < innerHeight && filters.bottom > 0 ? filters.bottom : 0);
      panel.current?.style.setProperty("--music-song-offset", Math.max(100, covered + 16) + "px");
      heading.current?.focus({ preventScroll: true });
      panel.current?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });
    });
    return () => cancelAnimationFrame(frame);
  }, [selection.genre, selection.season]);
  const data = loaded?.data.genre === selection.genre ? loaded.data : null;
  const songs = (data?.tracks || []).map(track => ({ ...track, count: selection.season ? track.seasons[selection.season] || 0 : track.plays, entity: data!.entities[track.key] })).filter(track => track.count > 0 && track.entity).sort((a, b) => b.count - a.count || a.entity.name.localeCompare(b.entity.name) || a.key.localeCompare(b.key));
  const updating = !!file && loaded?.file !== file && !failed;
  return <aside ref={panel} className="music-season-songs" role="region" aria-label={`${selection.genre} songs`} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); } }}>
    <div className="music-season-songs-inner">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="music-label">{selection.season ? seasonLabel : "All time"}</p><h3 ref={heading} tabIndex={-1} className="mt-2 break-words font-display text-[28px] leading-none">{selection.genre}</h3></div>
        <button type="button" className="shrink-0 rounded-md px-2 py-1 text-[13px] text-muted hover:text-ink" onClick={close} aria-label="Close genre songs">Close</button>
      </div>
      <p className="mt-3 text-[13px] text-muted" aria-live="polite">{data ? `${number(songs.reduce((sum, song) => sum + song.count, 0))} plays · ${number(songs.length)} songs` : "Songs in this genre"}</p>
      <div ref={scroller} className="music-season-song-list mt-4" role="region" tabIndex={0} aria-label="Genre song list" aria-busy={updating}>
        {updating && <p role="status" className="pb-3 text-[13px] text-muted">{data ? "Updating songs…" : "Loading songs…"}</p>}
        {failed ? <p role="status" className="text-[13px] text-muted">Song details are unavailable. Close and select this genre to retry.</p> : !file ? <p className="text-[13px] text-muted">Song details are being updated.</p> : data && !songs.length ? <p className="text-[13px] text-muted">No recorded songs for this selection.</p> : null}
        <ol>{songs.map(song => <li key={song.key} className="music-season-song">
          {song.entity.image && <img src={song.entity.image} width="36" height="36" alt="" loading="lazy" className="h-9 w-9 shrink-0 rounded-md object-cover" />}
          <div className="min-w-0 flex-1"><MusicLink entity={song.entity} details={song.entity} className="block w-fit max-w-full truncate text-[14px] font-medium">{song.entity.name}</MusicLink><p className="mt-1 truncate text-[12px] text-muted"><MusicArtists names={song.entity.artists || []} details={data?.entities} /></p></div>
          <span className="shrink-0 text-[13px] tabular-nums text-muted">{number(song.count)}<span className="sr-only"> plays</span></span>
        </li>)}</ol>
      </div>
    </div>
  </aside>;
}
