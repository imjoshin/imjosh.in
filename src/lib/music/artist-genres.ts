export interface ArtistGenreExpansion {
  source: "codex";
  originalGenres: string[];
  addedGenres: string[];
  updatedAt: string;
  note: string;
  sources: string[];
  model: string;
  reasoningEffort: string;
}

export interface ArtistGenreEntry {
  name: string;
  spotifyArtistId: string | null;
  /** Most representative first. Empty entries are retained for future classification. */
  genres: string[];
  source: "spotify" | "codex" | "manual" | null;
  updatedAt: string | null;
  note?: string;
  sources?: string[];
  model?: string;
  reasoningEffort?: string;
  genreExpansion?: ArtistGenreExpansion;
}

export interface ArtistGenreCatalog {
  version: 1;
  artists: Record<string, ArtistGenreEntry>;
}

export const artistGenreKey = (name: string) => name.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");

/** Shared display/catalog rules. Original provider responses are never changed. */
export function normalizeArtistGenres(input: readonly string[]): string[] {
  const genres = new Set<string>();
  for (const label of input) {
    const genre = artistGenreKey(label);
    if (!genre || /\bchristmas\b/.test(genre)) continue;
    const qualifiers: string[] = [];
    let christianAlias = false;
    let style = genre.replace(/\b(christian|worship|ccm)\b/g, word => {
      if (word === "christian") qualifiers.push(word);
      else christianAlias = true;
      return " ";
    });
    if (qualifiers.length || christianAlias) style = style.replace(/\s+/g, " ").replace(/^(?:and\b|[\s&,+/-])+|(?:\band|[\s&,+/-])+$/g, "").trim();
    for (const value of [...qualifiers, style, ...(christianAlias ? ["christian"] : [])]) if (value) genres.add(value);
  }
  return [...genres];
}

export function parseArtistGenreCatalog(value: unknown): ArtistGenreCatalog {
  const catalog = value as ArtistGenreCatalog;
  if (!catalog || catalog.version !== 1 || !catalog.artists || typeof catalog.artists !== "object" || Array.isArray(catalog.artists)) throw new Error("Invalid artist genre catalog");
  for (const [key, entry] of Object.entries(catalog.artists)) {
    if (!entry || typeof entry.name !== "string" || !key || artistGenreKey(entry.name) !== key || !Array.isArray(entry.genres) || entry.genres.some(g => typeof g !== "string" || !g.trim()) || ![null, "spotify", "codex", "manual"].includes(entry.source) || !(entry.spotifyArtistId === null || typeof entry.spotifyArtistId === "string") || !(entry.updatedAt === null || typeof entry.updatedAt === "string")) throw new Error(`Invalid artist genre entry: ${key}`);
    const expansion = entry.genreExpansion;
    if (expansion && (expansion.source !== "codex" || !Array.isArray(expansion.originalGenres) || expansion.originalGenres.length !== 1 || !Array.isArray(expansion.addedGenres) || expansion.addedGenres.length > 2 || [...expansion.originalGenres, ...expansion.addedGenres].some(g => typeof g !== "string" || !g.trim()) || typeof expansion.updatedAt !== "string" || typeof expansion.note !== "string" || !Array.isArray(expansion.sources) || expansion.sources.some(url => typeof url !== "string") || typeof expansion.model !== "string" || typeof expansion.reasoningEffort !== "string")) throw new Error(`Invalid artist genre expansion: ${key}`);
  }
  return catalog;
}

/** The committed catalog wins when populated; Spotify supplies missing artist genres. */
export function resolveArtistGenres<T extends { genres: string[] }>(spotify: Record<string, T>, catalog: ArtistGenreCatalog): Record<string, { genres: string[] }> {
  const result: Record<string, { genres: string[] }> = Object.create(null);
  for (const [name, entry] of Object.entries(spotify)) result[artistGenreKey(name)] = { genres: normalizeArtistGenres(entry.genres) };
  for (const [key, entry] of Object.entries(catalog.artists)) {
    const genres = normalizeArtistGenres(entry.genres);
    if (genres.length) result[key] = { genres };
  }
  return result;
}
