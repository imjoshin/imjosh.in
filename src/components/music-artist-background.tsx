"use client";

import { useId, type CSSProperties } from "react";
import { spotifyImage } from "@/lib/music/entity-links";
import { MusicSwap } from "./music-swap";

export interface MusicArtistPhoto { name: string; image: string | null }

export function findMusicArtistPhoto(name: string | undefined, artists: MusicArtistPhoto[]) {
  const normalized = name?.trim().toLowerCase();
  return spotifyImage(artists.find(artist => artist.name.trim().toLowerCase() === normalized && spotifyImage(artist.image))?.image);
}

export function MusicArtistBackground({ image, identity, variant = "feature" }: { image?: string; identity?: string; variant?: "feature" | "toast" }) {
  const filterId = `music-photo-${useId()}`;
  const photo = spotifyImage(image);
  return <div className={`music-artist-background music-artist-background--${variant}`} aria-hidden="true" style={{ "--music-photo-filter": `url("#${filterId}")` } as CSSProperties}>
    {/* Derive alpha after tinting and blurring, preserving the image's color and existing transparency. */}
    <svg className="absolute" width="0" height="0" focusable="false"><defs>
      <filter id={filterId} colorInterpolationFilters="sRGB">
        <feColorMatrix in="SourceGraphic" type="luminanceToAlpha" result="luminance" />
        <feComposite in="SourceGraphic" in2="luminance" operator="in" />
      </filter>
    </defs></svg>
    <MusicSwap identity={identity || photo || "empty"} className="h-full w-full">
      {photo && <img src={photo} alt="" width="640" height="640" onError={event => { event.currentTarget.style.visibility = "hidden"; }} />}
    </MusicSwap>
  </div>;
}
