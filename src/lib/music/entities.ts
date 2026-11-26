import type { Listen, MusicEntity, MusicEntityDataset, MusicEntityRef } from "./types.ts";
import { MUSIC_TIMEZONE, publicMusicListens } from "./aggregate.ts";
import { directSpotifyUrl, musicEntityKey, spotifyImage } from "./entity-links.ts";

export interface MusicEntityMetadata extends MusicEntityRef { genres?: string[]; album?: string | null; albumArtists?: string[] }
/** Only entities in approved listening history or public affinity rankings are seeded. Catalog membership is private. */
export function aggregateEntities(input: Listen[], favorites: MusicEntityRef[] = [], metadata: MusicEntityMetadata[] = [], now = new Date(), timezone = MUSIC_TIMEZONE): MusicEntityDataset {
  const details = new Map(metadata.map(item => [musicEntityKey(item.kind, item.name, item.artists), item]));
  const entities = new Map<string, MusicEntity>(), tracks = new Map<string, Set<string>>();
  const dates = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" });
  function ensure(ref: MusicEntityRef) {
    const key = musicEntityKey(ref.kind, ref.name, ref.artists);
    let entity = entities.get(key);
    if (!entity) {
      const detail = details.get(key);
      entity = { key, kind: ref.kind, name: ref.name, artists: ref.kind === "artist" ? [] : ref.artists || [], url: directSpotifyUrl(detail?.url, ref.kind) || directSpotifyUrl(ref.url, ref.kind), image: spotifyImage(detail?.image) || spotifyImage(ref.image) || null, genres: [...new Set(detail?.genres || [])].sort(), album: detail?.album || null, albumArtists: detail?.albumArtists || [], plays: 0, firstListen: null, lastListen: null, tracks: 0, msPlayed: 0, durationKnown: 0 };
      entities.set(key, entity); tracks.set(key, new Set());
    }
    return entity;
  }
  for (const listen of publicMusicListens(input, now)) {
    const track = listen.track, day = dates.format(new Date(listen.playedAt));
    const refs: MusicEntityRef[] = [{ kind: "track", name: track.title, artists: track.artists, url: track.url, image: track.image }, ...[...new Set(track.artists)].map(name => ({ kind: "artist" as const, name }))];
    if (track.album) refs.push({ kind: "album", name: track.album, artists: track.albumArtists?.length ? track.albumArtists : track.artists, image: track.image });
    for (const ref of new Map(refs.map(ref => [musicEntityKey(ref.kind, ref.name, ref.artists), ref])).values()) {
      const entity = ensure(ref);
      entity.plays++;
      entity.firstListen = entity.firstListen === null || day < entity.firstListen ? day : entity.firstListen;
      entity.lastListen = entity.lastListen === null || day > entity.lastListen ? day : entity.lastListen;
      entity.msPlayed += listen.msPlayed || 0; entity.durationKnown += Number(listen.msPlayed !== null);
      entity.genres = [...new Set([...entity.genres, ...track.genres])].sort();
      tracks.get(entity.key)!.add(track.key);
      if (ref.kind === "track") { entity.album ||= track.album; entity.albumArtists = track.albumArtists?.length ? track.albumArtists : track.artists; }
    }
  }
  for (const ref of favorites) {
    const entity = ensure(ref);
    for (const name of ref.artists || []) ensure({ kind: "artist", name });
    if (ref.kind === "track" && entity.album) ensure({ kind: "album", name: entity.album, artists: entity.albumArtists?.length ? entity.albumArtists : ref.artists });
  }
  for (const entity of entities.values()) entity.tracks = tracks.get(entity.key)!.size;
  return { version: 1, generatedAt: now.toISOString(), timezone, entities: Object.fromEntries([...entities].sort(([a], [b]) => a.localeCompare(b))) };
}
