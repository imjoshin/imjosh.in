import type { MusicTrack } from "./types.ts";

/** Match genre labels, never track titles or an artist's name. Raw data is not changed. */
export function isKidsGenre(genre: string): boolean {
  return /\b(kids?|children'?s?|nursery|lullab(?:y|ies)|kindie|baby|toddler|preschool|disney|cartoon|infantil|enfants?|kinder(?:musik|lieder))\b/i.test(genre.normalize("NFKC").replace(/[’‘]/g, "'"));
}
export const isKidsTrack = (track: Pick<MusicTrack, "genres">) => track.genres.some(isKidsGenre);

/** Explicit Disney/Pixar credits and identifiable soundtrack albums, including blank genres. */
export function isDisneyMusic(track: { title?: string; artists: string[]; album?: string | null; labels?: string[] }): boolean {
  if ([track.title || "", ...track.artists, track.album || "", ...track.labels || []].some(text => /\b(?:disney|pixar)\b/i.test(text.normalize("NFKC")))) return true;
  const album = track.album || "";
  if (/^(?:moana(?:\s+\d+)?|encanto|frozen(?:\s+(?:2|ii))?)\s*(?:$|[(:-])/i.test(album)) return true;
  return /\b(?:soundtrack|broadway|motion picture)\b/i.test(album) && /\b(?:the lion king|the little mermaid|beauty and the beast|aladdin|tangled|pocahontas|mulan|coco|luca|zootopia|wish|brave|tarzan|lilo\s*(?:&|and)\s*stitch|toy story|the jungle book|mary poppins|the princess and the frog)\b/i.test(album);
}

export const isExcludedMusic = (track: Pick<MusicTrack, "title" | "artists" | "album" | "genres" | "labels">) => isKidsTrack(track) || isDisneyMusic(track);
