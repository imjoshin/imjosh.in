import type { MusicEntityKind, MusicEntityRef } from "./types.ts";

const normalized = (value: string) => value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
export function musicEntityKey(kind: MusicEntityKind, name: string, artists: string[] = []) {
  return `${kind}:${JSON.stringify([normalized(name), kind === "artist" ? [] : [...new Set(artists.map(normalized).filter(Boolean))].sort()])}`;
}
export function directSpotifyUrl(value: string | null | undefined, kind: MusicEntityKind): string | null {
  try {
    const url = new URL(value || "");
    const match = url.pathname.match(new RegExp(`^/${kind}/([A-Za-z0-9]{22})/?$`));
    return url.origin === "https://open.spotify.com" && !url.username && !url.password && match ? `https://open.spotify.com/${kind}/${match[1]}` : null;
  } catch { return null; }
}
export function spotifyEntityUrl(entity: MusicEntityRef) {
  return directSpotifyUrl(entity.url, entity.kind) || `https://open.spotify.com/search/${encodeURIComponent(`${entity.kind}:"${entity.name}"${entity.kind !== "artist" && entity.artists?.length ? ` artist:"${entity.artists.join(" ")}"` : ""}`)}`;
}
export const spotifyImage = (url: string | null | undefined) => url && /^https:\/\/(i\.scdn\.co|image-cdn[^/]*\.spotifycdn\.com)\//.test(url) ? url : undefined;
