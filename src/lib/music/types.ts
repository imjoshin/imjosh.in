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

export interface MusicArtistSeason {
  key: string;
  label: string;
  plays: number;
}
export interface MusicHistoryArtist {
  key: string;
  name: string;
  plays: number;
  topSeasons: number;
  seasonPlays: number[];
  url?: string | null;
  image?: string | null;
}
export interface MusicArtistHistoryDataset {
  version: 1;
  generatedAt: string;
  timezone: string;
  period: "all";
  platform: "all";
  startYear: number | null;
  endYear: number;
  recentSeasons: number;
  buckets: MusicArtistSeason[];
  groups: { key: "all-time" | "recent" | "past"; artists: MusicHistoryArtist[] }[];
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

export type SoundtrackMetric = "genres" | "artists" | "albums";
export type MusicChartGranularity = "day" | "month" | "year";
export interface MusicBucket { key: string; label: string }
export interface SoundtrackSeries {
  key: string;
  name: string;
  artists: string[];
  url?: string | null;
  image?: string | null;
  /** Qualifying plays per bucket, including buckets outside this series' top five; lower counts are zero. */
  plays: number[];
}
export interface SoundtrackMetricData {
  series: SoundtrackSeries[];
  classifiedPlays: number;
  unclassifiedPlays: number;
}
export interface MusicSoundtrackDataset {
  version: 1;
  generatedAt: string;
  timezone: string;
  platform: MusicPlatform | "all";
  period: string;
  granularity: MusicChartGranularity;
  buckets: MusicBucket[];
  metrics: Record<SoundtrackMetric, SoundtrackMetricData>;
  minimumPlays?: number;
  songFiles?: Partial<Record<SoundtrackMetric, Record<string, string>>>;
}

export interface MusicSongCounts {
  key: string;
  plays: number;
  buckets: Record<string, number>;
}

export interface MusicSongsDataset {
  version: 1;
  generatedAt: string;
  period: string;
  metric: SoundtrackMetric;
  key: string;
  tracks: MusicSongCounts[];
  entities: Record<string, MusicEntity>;
}

export interface SpotifySnapshot {
  generatedAt: string;
  ranges: Record<string, { tracks: RankedMusic[]; artists: RankedMusic[] }>;
  playlists: { id: string; name: string; image: string | null; url: string; tracks: number }[];
}

export interface MusicRecentTrack {
  id: string;
  key: string;
  name: string;
  artists: string[];
  album: string | null;
  url: string | null;
  image: string | null;
}

export interface MusicPlaybackSnapshot {
  version: 1;
  checkedAt: string;
  status?: "playing" | "stopped" | "unknown";
  /** Legacy observations may include an expiry, which current playback ignores. */
  expiresAt?: string;
  artistImages?: { name: string; image: string | null }[];
  recentTracks?: MusicRecentTrack[];
  track: { key: string; name: string; artists: string[]; album: string | null; url: string | null; image: string | null } | null;
}
