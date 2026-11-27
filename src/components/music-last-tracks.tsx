"use client";

import type { MusicRecentTrack } from "@/lib/music/types";
import { spotifyImage } from "@/lib/music/entity-links";
import { musicPlaceholderStyle } from "@/lib/music/placeholder";
import { MusicArtists, MusicLink } from "./music-entity-link";
import { useMusicListMotion } from "./music-motion";

function RecentTrackStrip({ tracks }: { tracks: MusicRecentTrack[] }) {
  const motion = useMusicListMotion(tracks.map((track, index) => ({ key: track.id, track, rank: index + 1 })), 0);
  return <div className="music-last-tracks-viewport" role="region" aria-label="Recent Spotify tracks, newest first" tabIndex={0}>
    <div className="music-last-tracks-collection" style={motion.containerStyle}><ol ref={motion.setRoot} className="music-last-tracks-list">{motion.rows.map(({ item: { key, track, rank }, phase }) => <li ref={motion.bind(key)} key={key} data-analytics-item-rank={rank} className="music-last-track" data-phase={phase} aria-hidden={phase === "exit" || undefined} inert={phase === "exit" || undefined} style={phase === "exit" ? motion.exitStyle(key) : undefined}>
      <MusicLink entity={{ kind: "track", ...track }} analyticsSlot="cover" className="relative block rounded-[14px]">
        <span className="music-cover block aspect-square w-full rounded-[14px]" style={musicPlaceholderStyle(track.name)}>{spotifyImage(track.image) ? <img src={spotifyImage(track.image)} width="180" height="180" alt="" /> : <span aria-hidden="true">♫</span>}</span>
      </MusicLink>
      <h3 className="mt-3 truncate text-[14px] font-medium"><MusicLink entity={{ kind: "track", ...track }}>{track.name}</MusicLink></h3>
      <p className="mt-1 truncate text-[13px] text-muted"><MusicArtists names={track.artists} /></p>
    </li>)}</ol></div>
  </div>;
}

export function MusicLastTracks({ tracks }: { tracks: MusicRecentTrack[] }) {
  return <section data-analytics-view="recent_tracks" data-analytics-period="recent" aria-labelledby="music-last-tracks-title" className="min-w-0">
    <div className="mb-5 flex items-end justify-between gap-4"><div><p className="music-label">Just off the turntable</p><h2 id="music-last-tracks-title" className="mt-2 font-display text-[42px] leading-none">Last <em className="text-accent">tracks.</em></h2></div><p className="music-last-tracks-swipe text-[12px] text-muted">Swipe to rewind <span aria-hidden="true">→</span></p></div>
    {tracks.length ? <RecentTrackStrip tracks={tracks} /> : <p className="text-[14px] text-muted">Recent tracks will appear here after the next listening update.</p>}
    <p className="mt-4 text-[12px] text-muted">Recent Spotify plays, newest first.</p>
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{tracks[0] ? `Latest track: ${tracks[0].name} by ${tracks[0].artists.join(", ")}` : ""}</p>
  </section>;
}
