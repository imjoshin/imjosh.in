# Music job performance proposals

Status: proposed work, not implemented. This document does not change production schedules.

## Audit evidence

Audited on November 27, 2026 by tracing the scheduled workers and replaying publication against production data. The replay redirected every write to memory and stubbed optional artist-photo API requests. It did not modify production data, perform a full Spotify collection, or measure production writes.

The latest saved successful history run had 190.384 seconds between the collector's `fetchedAt` and the job's `completedAt`, approximately 3 minutes 10 seconds. This is a timestamp-based observation, not an instrumented function duration. That run recorded only two Spotify API requests and was not a daily full sync.

The replay processed approximately 137,000 listening records across 116 monthly partitions and produced 1,537 dataset references:

- 30 summary datasets.
- 30 soundtrack chart datasets.
- 1,472 soundtrack song-list drill-down datasets.
- Five other datasets: Spotify favorites, playback, recommendations, artist history, and entity details.

| Replay work | Approximate elapsed time | Main cause |
| --- | ---: | --- |
| Compare and prepare public datasets | 104 seconds | Sequential reads of all 1,537 previous dataset payloads, approximately 100 MB |
| Build soundtrack charts and song groups | 17.6 seconds | Repeated history processing across platforms, periods, and metrics |
| Determine artist-photo eligibility | 9.5 seconds | A complete history read plus catalogs and approximately 28 MB of saved ranking snapshots |
| Load and enrich history for publication | 9.1 seconds | A second complete history read and metadata enrichment |
| Build summary charts and entity details | 7.2 seconds | Full-history calculations and repeated public-history preparation |
| Build recommendations and artist history | 1.1 seconds | Comparatively small calculations |

These timings were measured from the local computer reading Netlify Blobs. They identify costly operations but are not a production phase breakdown or a guaranteed estimate of savings. The replay read every prior dataset even though only two replacement dataset writes, plus the manifest, were needed.

Completed calendar years account for 868 of the 1,537 references, approximately 57%. File counts do not imply the same percentage of runtime or bytes.

The audit scripts and detailed measurement reports remain in ignored `.music/`. The evidence above is recorded here so this proposal does not depend on those local artifacts.

## What runs today

The ten-minute scheduler starts [`music-update-background`](netlify/functions/music-update-background.mts). Its normal path:

1. Acquires the history-worker lock and reads the daily full-sync marker.
2. Uses the shared cached Spotify access token, refreshing it under a separate token lock when necessary.
3. Fetches and privately archives recent-play responses, normalizes events, and merges them into monthly partitions. It also updates recent-track state and the Spotify track catalog.
4. Loads the complete history to determine artist-photo eligibility, merges supplied photos into the saved catalog, and attempts missing-photo lookups with retry/backoff behavior.
5. Performs optional Spotify genre enrichment for missing or stale provider entries. The committed genre catalog takes precedence during publication.
6. Loads history again, applies source precedence, metadata, and publication exclusions, and rebuilds every summary, ranking, entity total, recommendation, artist-history chart, soundtrack chart, and song-list payload.
7. Reads previous public payloads to compare their JSON, writes changed immutable files, and switches the manifest last.

There is no overall change guard to avoid a rebuild when collection produces no new canonical listens. Individual payload reuse saves writes after the calculations and comparison reads have already happened.

Once per UTC day, the same worker also collects full Spotify snapshots: profile, devices and queue, three ranges of top tracks/artists, saved tracks/albums/shows/episodes/audiobooks, followed artists, and playlists with their items. This work is already daily. Separating it would isolate its latency and failures, rather than reduce its existing frequency.

The independent one-minute playback worker already publishes Now Playing and Last Tracks without loading listening partitions or rebuilding the history manifest. Preserve that separation.

Relevant implementation: [`spotify.ts`](scripts/music/spotify.ts), [`artist-images.ts`](scripts/music/artist-images.ts), [`publish.ts`](scripts/music/publish.ts), [`store.ts`](scripts/music/store.ts), and [`soundtrack.ts`](src/lib/music/soundtrack.ts).

## Prioritized work

### 1. Replace full-payload comparison reads with content fingerprints

- [ ] Persist a stable content fingerprint for each logical dataset alongside its current immutable file reference.
- [ ] Compute fingerprints using the same content semantics as today's comparison, excluding the volatile top-level `generatedAt` field.
- [ ] Reuse the previous file reference when its fingerprint matches, without downloading its payload.
- [ ] Support a safe migration for existing manifests that have no fingerprints.
- [ ] Continue writing immutable payloads before switching the manifest, preserving existing browser caching and older clients.

Why: the replay spent approximately 103 seconds reading previous public payloads. This is the largest measured opportunity and does not require reducing data freshness. Fingerprints eliminate comparison reads; they do not by themselves eliminate aggregate calculations.

### 2. Prepare history once and reuse it

- [ ] Share a consistent history snapshot between photo eligibility and publication instead of reading all 116 partitions twice.
- [ ] Reuse approved-history preparation, source precedence, deduplication, date parts, and metadata indexes across aggregate functions where their semantics match.
- [ ] Maintain a compact artist eligibility/identity index so missing-photo work does not require loading complete ranking snapshots on every run.
- [ ] Consider versioned partition summaries or a cached historical base for incremental calculations, invalidated by imports and metadata/policy changes.

Why: the replay made 232 listening-partition reads. Multiple aggregate functions also independently sort, deduplicate, filter, and format dates for the same history. Preserve the existing distinctions between verified history, public history, and playback eligibility when sharing preparation.

### 3. Avoid rebuilding when inputs and time-dependent outputs are unchanged

- [ ] Detect actual changes to canonical listening partitions, rather than treating returned recent-play rows as new events.
- [ ] Track relevant metadata, genre, image, import-exclusion, and publication-policy revisions.
- [ ] Account for Eastern calendar boundaries, rolling-window expirations, and other date-dependent outputs even when there are no new plays.
- [ ] Skip unaffected datasets and reuse their existing references.

Why: quiet periods currently trigger the same complete rebuild and comparison work. A change guard must preserve rolling-window accuracy and must not delay applying privacy or content-exclusion changes.

### 4. Separate frequent collection from slower enrichment and publication

- [ ] Introduce the proposed cadences below after fingerprinting and dependency tracking are in place.
- [ ] Keep optional metadata failures and rate-limit waits from holding up collected-history publication.
- [ ] Use the committed genre catalog before requesting fallback Spotify genres; scheduled jobs must not generate or rewrite that committed catalog.
- [ ] Preserve the quick missing-photo path for active public Now Playing artists, cached-photo fallback, and existing eligibility thresholds.
- [ ] Coordinate history manifest updates so slower workers cannot overwrite a newer publication with a stale manifest.

Why: much of the data changes slowly. Decoupling also prevents the daily full sync from extending a normal history refresh. Moving recommendations or artist history alone has limited performance value: together they took approximately 1.1 seconds in the replay.

## Proposed cadences

| Cadence | Work | Reason and freshness tradeoff |
| --- | --- | --- |
| Every minute | Existing Now Playing and Last Tracks worker | Preserve responsive playback independently of history jobs |
| Every ten minutes | Recent-play ingestion and archival; current headline/entity totals, recent rankings, and current charts | Keep newly recorded listening visible and reduce collection gaps |
| Every six hours | Optional photo and fallback genre enrichment; long-term soundtrack charts and matching song lists; recommendations and artist-history rankings | These can tolerate slower refreshes; long-term charts and drill-downs must advance together |
| Every 24 hours | Completed calendar-year datasets, full Spotify account/library/playlist/affinity snapshots, and reconciliation | Historical counts are usually stable; full Spotify snapshots already use this frequency |

The exact split of current and long-term charts remains an implementation decision. A reasonable starting point is keeping the rolling 30-day and current-year views on the frequent path, while moving all-time and rolling 365-day soundtrack charts and their drill-downs to six hours. Current headline and hover totals should remain fresh independently.

Do not move recent-play collection to six hours or daily merely to reduce publication work. Retain prompt collection and private archival, then publish different derived views at appropriate cadences.

### Historical files have live dependencies

Completed-year song-list payloads currently embed entity details containing all-time play counts, first/last dates, artwork, and genres. Today's listening or metadata corrections can therefore change an old-year payload even when its historical song counts are unchanged.

- [ ] Separate stable historical counts from independently refreshed entity details before treating historical payloads as static.
- [ ] Preserve all-time hover totals for every song and artist referenced by a drill-down, including entities outside the main visible rankings.
- [ ] Invalidate affected historical outputs after imports, source-precedence changes, metadata corrections, or publication-policy changes. A daily schedule must not delay a required privacy or exclusion correction.
- [ ] Publish each chart and its song-list references as a consistent revision. Preserve the single-manifest commit behavior or provide an equally safe coordinated mechanism.

Why: simply freezing the 868 completed-year files would otherwise freeze embedded live totals or produce inconsistent chart and hover data.

## Measurement and acceptance

- [ ] Add private, aggregate phase timings for collection, optional enrichment, history reads/preparation, each aggregate family, comparison, writes, and manifest commit.
- [ ] Record run type, changed-partition count, request/retry counts, bytes read, datasets reused/written, and total duration without logging credentials or individual listening records.
- [ ] Compare ordinary, idle, daily-full, rate-limited, and import-reconciliation runs in production. Establish typical and slow-run durations rather than promising a target from one replay.
- [ ] Verify that unchanged publication no longer downloads every previous dataset and idle runs avoid unnecessary calculations.
- [ ] Add regression coverage for fingerprints, invalidation, rolling windows and calendar boundaries, historical hover totals, concurrent publication, and optional-metadata failures.
- [ ] Preserve all private originals and canonical records, public exclusions, measured-duration rules, source precedence, image caching/backoff, and local-only genre-catalog generation.
- [ ] Run `npm run check` and `npm run build` for implementation changes, update `docs/music.md` with the final job contract, and verify playback/history independence and coherent browser refreshes.

Optimize the existing publication path first, then reassess which slower schedules provide worthwhile savings. Avoid turning one complete rebuild into several independently scheduled complete rebuilds.
