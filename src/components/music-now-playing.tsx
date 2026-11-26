"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { MusicPlaybackSnapshot } from "@/lib/music/types";
import { currentMusicPlayback } from "@/lib/music/collection";
import { spotifyImage } from "@/lib/music/entity-links";
import { MusicArtists, MusicLink } from "./music-entity-link";
import { useMusicPresence } from "./music-motion";

const dismissalKey = "imjosh.in:music:now-playing-dismissed";
export function MusicNowPlaying({ snapshot }: { snapshot: MusicPlaybackSnapshot | null }) {
  const [dismissed, setDismissed] = useState(true), [now, setNow] = useState(0);
  const [viewportBottom, setViewportBottom] = useState(0);
  useEffect(() => {
    const viewport = window.visualViewport;
    const measure = () => setViewportBottom(viewport ? Math.max(0, innerHeight - viewport.height - viewport.offsetTop) : 0);
    measure(); addEventListener("resize", measure); viewport?.addEventListener("resize", measure); viewport?.addEventListener("scroll", measure);
    return () => { removeEventListener("resize", measure); viewport?.removeEventListener("resize", measure); viewport?.removeEventListener("scroll", measure); };
  }, []);
  useEffect(() => { try { setDismissed(sessionStorage.getItem(dismissalKey) === "true"); } catch { setDismissed(false); } }, []);
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const expiry = Math.min(Date.parse(snapshot?.expiresAt || ""), Date.parse(snapshot?.checkedAt || "") + 90000);
    const timer = Number.isFinite(expiry) ? setTimeout(update, Math.max(0, expiry - Date.now() + 25)) : undefined;
    document.addEventListener("visibilitychange", update);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", update); };
  }, [snapshot]);
  const track = !dismissed && now ? currentMusicPlayback(snapshot, now) : null;
  const rows = useMusicPresence(track ? [track] : []);
  const dismiss = () => { setDismissed(true); try { sessionStorage.setItem(dismissalKey, "true"); } catch { /* Dismissal still works for this visit. */ } };
  return <div className="music-now-playing-region" role="region" aria-label="Currently listening to" style={{ "--music-viewport-bottom": `${viewportBottom}px` } as CSSProperties}><div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{track ? `Currently listening to ${track.name} by ${track.artists.join(", ")}` : ""}</div>{rows.map(({ item, phase }) => <aside key={item.key} className="music-now-playing" data-phase={phase} aria-hidden={phase === "exit" || undefined} inert={phase === "exit" || undefined}>
    <div className="music-now-playing-art" aria-hidden="true">{spotifyImage(item.image) ? <img src={spotifyImage(item.image)} width="64" height="64" alt="" /> : <span>♫</span>}</div>
    <div className="min-w-0 flex-1"><p className="music-label mb-2 flex items-center gap-2"><span className="music-playing-bars" aria-hidden="true"><i /><i /><i /></span>Currently listening to</p><p className="truncate font-medium"><MusicLink entity={{ kind: "track", name: item.name, artists: item.artists, url: item.url, image: item.image }}>{item.name}</MusicLink></p><p className="mt-1 truncate text-[13px] text-muted"><MusicArtists names={item.artists} /></p></div>
    <button type="button" className="music-now-playing-dismiss" aria-label="Dismiss currently listening toast" onClick={dismiss}>×</button>
  </aside>)}</div>;
}
