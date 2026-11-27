import type { MusicRecommendationsDataset, MusicRecommendedArtist, MusicRecommendedTrack } from "@/lib/music/types";
import { spotifyImage } from "@/lib/music/entity-links";
import { musicPlaceholderStyle } from "@/lib/music/placeholder";
import { MusicLink } from "./music-entity-link";
import { MusicNumber } from "./music-motion";
import "./music-recommendations.css";

function Artwork({ image, name, className = "" }: { image: string | null; name: string; className?: string }) {
  const source = spotifyImage(image);
  return <span className={`music-pick-art ${className}`} style={musicPlaceholderStyle(name)}>{source ? <img src={source} alt="" loading="lazy" width="480" height="480" /> : <span aria-hidden="true">{name.slice(0, 1)}</span>}</span>;
}

function Song({ track }: { track: MusicRecommendedTrack }) {
  return <li className="music-pick-song"><Artwork image={track.image} name={track.name} /><span className="music-pick-song-copy"><span className="music-pick-song-title"><MusicLink entity={{ kind: "track", ...track }} className="music-pick-song-name">{track.name}</MusicLink></span><span className="music-pick-song-plays"><MusicNumber value={track.plays} /> {track.period === "6m" ? "plays in six months" : "all-time plays"}</span></span></li>;
}

function ArtistCard({ artist }: { artist: MusicRecommendedArtist }) {
  return <article className="music-pick">
    <div className="music-pick-portrait" aria-hidden="true"><Artwork image={artist.image} name={artist.name} /></div>
    <div className="music-pick-intro"><p className="music-pick-eyebrow">On my shortlist</p><h3><MusicLink entity={{ kind: "artist", name: artist.name, url: artist.url, image: artist.image }}>{artist.name}</MusicLink></h3><p className="music-pick-count"><MusicNumber value={artist.plays} /> plays in six months</p></div>
    <div className="music-pick-songs"><p className="music-pick-start">Start here</p><ol>{artist.tracks.map(track => <Song key={track.key} track={track} />)}</ol></div>
  </article>;
}

export function MusicRecommendations({ data }: { data: MusicRecommendationsDataset | null | undefined }) {
  const artists = data?.artists || [];
  return <section id="artist-picks" aria-labelledby="music-picks-title" className="music-picks">
    <div className="music-picks-heading"><div><p className="music-label">A few personal recommendations</p><h2 id="music-picks-title">Artists I think you<br className="music-picks-title-break" /> should <em>check out.</em></h2></div><p>My top five from the last six months.<br />One all-time favorite. Two recent favorites.</p></div>
    {artists.length ? <div className="music-picks-grid">{artists.map(artist => <ArtistCard key={artist.key} artist={artist} />)}</div> : <p className="panel rounded-[20px] p-6 text-muted">A few recommendations are on the way as the listening collection updates.</p>}
  </section>;
}
