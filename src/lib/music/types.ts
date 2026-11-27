export type MusicPlatform = "spotify" | "google-play-music" | "youtube-music";
export const platformLabels: Record<MusicPlatform, string> = { spotify: "Spotify", "google-play-music": "Google Play Music", "youtube-music": "YouTube Music" };

export interface MusicTrack {
  key: string;
  title: string;
  artists: string[];
  album: string | null;
  albumArtists?: string[];
  platformId: string | null;
  isrc: string | null;
  url: string | null;
  image: string | null;
  genres: string[];
  labels?: string[];
}

/** Private canonical event. Raw provider records are archived separately, without field loss. */
export interface Listen {
  version: 1;
  id: string;
  platform: MusicPlatform;
  playedAt: string;
  timestampKind: "start" | "end" | "activity";
  timestampPrecision: "second" | "minute";
  msPlayed: number | null;
  trackDurationMs: number | null;
  skipped: boolean | null;
  privateSession: boolean | null;
  media: "music" | "podcast" | "video";
  track: MusicTrack;
  source: "extended-export" | "account-export" | "takeout" | "api";
  rawRef: string;
}

export interface RankedMusic {
  key: string;
  name: string;
  artists: string[];
  image: string | null;
  url: string | null;
  plays: number;
  msPlayed: number;
}

export type MusicEntityKind = "track" | "album" | "artist";
export interface MusicEntityRef {
  kind: MusicEntityKind;
  name: string;
  artists?: string[];
  url?: string | null;
  image?: string | null;
}
export interface MusicEntity extends MusicEntityRef {
  key: string;
  plays: number;
  firstListen: string | null;
  lastListen: string | null;
  genres: string[];
  album?: string | null;
  albumArtists?: string[];
  tracks: number;
  msPlayed: number;
  durationKnown: number;
}
export interface MusicEntityDataset {
  version: 1;
  generatedAt: string;
  timezone: string;
  entities: Record<string, MusicEntity>;
}

export interface MusicStats {
  plays: number;
  artists: number;
  tracks: number;
  msPlayed: number;
  durationKnown: number;
  genreUnknown: number;
  firstListen: string | null;
  lastListen: string | null;
  topTracks: RankedMusic[];
  topArtists: RankedMusic[];
  topAlbums: RankedMusic[];
  months: { month: string; plays: number; msPlayed: number }[];
  /** Daily aggregates for the rolling 30-day view; absent in older summaries. */
  days?: { date: string; plays: number; msPlayed: number }[];
  weekdays: number[];
  hours: number[];
  platforms: Partial<Record<MusicPlatform, number>>;
}

export interface MusicDataset {
  version: 1;
  generatedAt: string;
  timezone: string;
  period: string;
  platform: MusicPlatform | "all";
  stats: MusicStats;
}

export interface MusicManifest {
  version: 1;
  generatedAt: string;
  timezone: string;
  periods: string[];
  platforms: MusicPlatform[];
  files: Record<string, string>;
  notes: string[];
}

export type SeasonalMetric = "genres" | "artists" | "albums";
export type MusicChartGranularity = "year" | "season";
export interface MusicSeason { key: string; label: string }
export interface SeasonalSeries {
  key: string;
  name: string;
  artists: string[];
  url?: string | null;
  /** Recorded plays for every period, including periods outside this series' top five. */
  plays: number[];
}
export interface SeasonalMetricData {
  series: SeasonalSeries[];
  classifiedPlays: number;
  unclassifiedPlays: number;
}
export interface MusicSeasonalDataset {
  version: 1;
  generatedAt: string;
  timezone: string;
  platform: MusicPlatform | "all";
  seasons: MusicSeason[];
  metrics: Record<SeasonalMetric, SeasonalMetricData>;
  /** Calendar-year totals ranked independently of the seasonal cutoff. Absent in older summaries. */
  annual?: { years: MusicSeason[]; metrics: Record<SeasonalMetric, SeasonalMetricData> };
  minimumPlays?: number;
  songFiles?: Partial<Record<SeasonalMetric, Record<string, string>>>;
  /** Kept for clients opened before artist and album song lists were added. */
  genreFiles?: Record<string, string>;
}

export interface MusicSongCounts {
  key: string;
  plays: number;
  seasons: Record<string, number>;
  years?: Record<string, number>;
}

export interface MusicSongsDataset {
  version: 1;
  generatedAt: string;
  metric: SeasonalMetric;
  key: string;
  /** Legacy genre clients use this field instead of metric/key. */
  genre?: string;
  tracks: MusicSongCounts[];
  entities: Record<string, MusicEntity>;
}

export interface SpotifySnapshot {
  generatedAt: string;
  ranges: Record<string, { tracks: RankedMusic[]; artists: RankedMusic[] }>;
  playlists: { id: string; name: string; image: string | null; url: string; tracks: number }[];
}

export interface MusicPlaybackSnapshot {
  version: 1;
  checkedAt: string;
  status?: "playing" | "stopped" | "unknown";
  /** Legacy observations may include an expiry, which current playback ignores. */
  expiresAt?: string;
  track: { key: string; name: string; artists: string[]; album: string | null; url: string | null; image: string | null } | null;
}
