"use client";

import { useEffect, useState } from "react";
import type { MusicPlaybackSnapshot } from "@/lib/music/types";
import { currentMusicPlayback } from "@/lib/music/collection";
import { spotifyImage } from "@/lib/music/entity-links";
import { musicPlaceholderStyle } from "@/lib/music/placeholder";
import { MusicArtists, MusicLink } from "./music-entity-link";
import { useMusicPresence } from "./music-motion";
import { MusicSwap, MusicSwapGroup } from "./music-swap";
import { findMusicArtistPhoto, MusicArtistBackground, type MusicArtistPhoto } from "./music-artist-background";
import { MusicScrollingText } from "./music-scrolling-text";

export function MusicNowPlaying({ snapshot, artistImages = [] }: { snapshot: MusicPlaybackSnapshot | null; artistImages?: MusicArtistPhoto[] }) {
  const [dismissed, setDismissed] = useState(false);
  const [lastTrack, setLastTrack] = useState<MusicPlaybackSnapshot["track"]>(null);
  useEffect(() => {
    // Keep playback through unavailable updates; only a confirmed stop clears it.
    setLastTrack(previous => currentMusicPlayback(snapshot, previous));
  }, [snapshot]);
  const track = dismissed ? null : lastTrack;
  const rows = useMusicPresence(track ? [{ key: "now-playing", track }] : []);
  const dismiss = () => setDismissed(true);
  return <div className="music-now-playing-region" role="region" aria-label="Currently listening to"><div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{track ? `Currently listening to ${track.name} by ${track.artists.join(", ")}` : ""}</div>{rows.map(({ item: { key, track: item }, phase }) => <aside key={key} className="music-now-playing" data-phase={phase} aria-hidden={phase === "exit" || undefined} inert={phase === "exit" || undefined}>
    <MusicSwapGroup identity={item.key}><MusicArtistBackground image={findMusicArtistPhoto(item.artists[0], artistImages)} identity={item.key} variant="toast" />
    <MusicSwap identity={item.key} className="music-now-playing-art"><div aria-hidden="true">{spotifyImage(item.image) ? <img src={spotifyImage(item.image)} width="64" height="64" alt="" /> : <span className="music-cover h-full w-full" style={musicPlaceholderStyle(item.name)}>♫</span>}</div></MusicSwap>
    <div className="music-now-playing-copy min-w-0 flex-1"><p className="music-label mb-2 flex items-center gap-2"><span className="music-playing-bars" aria-hidden="true"><i /><i /><i /></span>Currently listening to</p><MusicSwap identity={item.key}><MusicScrollingText text={item.name} className="font-medium"><MusicLink entity={{ kind: "track", name: item.name, artists: item.artists, url: item.url, image: item.image }}>{item.name}</MusicLink></MusicScrollingText><MusicScrollingText text={item.artists.join(", ")} className="mt-1 text-[13px] text-muted"><MusicArtists names={item.artists} /></MusicScrollingText></MusicSwap></div>
    </MusicSwapGroup><button type="button" className="music-now-playing-dismiss" aria-label="Dismiss currently listening toast" onClick={dismiss}>×</button>
  </aside>)}</div>;
}
