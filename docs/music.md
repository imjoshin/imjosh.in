# Music collection

`/music/` stays a static Next.js page. It renders a saved summary and fetches compact JSON datasets. Netlify Functions collect and serve data independently of Next.js. No public endpoint can retrieve raw listens or credentials.

## Data model and storage

`.music/` is private ignored local storage. Production uses `music-private-v1` in Netlify Blobs:

- `raw/<sha256>/<filename>` preserves original files and complete API responses, with retrieval URL and date, without authorization headers.
- `imports/` preserves parsed files, including currently unused fields. Reports identify malformed files.
- `listens/<platform>/<UTC-month>.json.gz` contains canonical events: platform, timestamp and precision, start/end/activity semantics, measured duration, track length, recording metadata, source IDs, and a raw reference.
- `catalog/` holds track metadata and artist genres with provider, artist ID, and retrieval date.
- `snapshots/` holds complete current library, playlist, and ranking payloads. Original pages remain archived as snapshots change.
- `secrets/spotify.json` holds the OAuth refresh token. Credentials are never included in `music:pull`.
- `state/` records collection outcomes, unsupported endpoints, possible history gaps, and the worker lock.

Platforms are `spotify`, `google-play-music`, and `youtube-music`. Exact normalized title and artist metadata joins recordings across providers. Editions and remixes remain distinct; platform IDs and ISRCs are retained. Uploader names are not recording artists. Library entries and lifetime play-count snapshots never become fabricated dated plays. Missing measured duration remains null; track length does not fill it.

Production `music-public-v1` holds immutable `datasets/<hash>.json` summaries and an atomic `manifest.json`. `public/music/` is an ignored local/build mirror. Public summaries have no raw references, usernames, IP addresses, exact individual timestamps, tokens, or device metadata. Private sessions and non-music media remain archived and are excluded from public statistics.

The listening curve uses daily counts for Last 30 days and monthly counts for Last year, All time, and individual years. Only 30-day summaries publish `stats.days`, with Eastern calendar dates, recorded plays, and measured milliseconds. Empty dates within a nonempty rolling window have zero counts; partial boundary dates retain the existing rolling 30-day cutoff. Daily totals equal the period totals after the same public exclusions. Older summaries without daily counts show an empty daily chart until the next publication rather than treating monthly counts as days. The preset pills appear in Last 30 days, Last year, All time order. Once the filter bar sticks beneath the navigation, it eases outward slightly; reduced motion applies the width change immediately.

## Public exclusions and soundtrack charts

Keep all originals and canonical events. Before aggregation, enrich genres and exclude every track with a kids genre. Every period, platform, total, favorite, and chart uses that filtered input. Provider affinity rankings use the same classification. Children's music, kids, nursery rhymes, lullabies, kindie, baby, toddler, preschool, and equivalents are matched as genre labels. Titles and artist names are not genre evidence. Unknown genres stay explicitly unclassified, with coverage counts in summaries. Reaggregation applies catalog improvements to historical records.

Disney/Pixar artist, title, album, and label credits, plus identified Disney soundtrack albums, are excluded even with missing genre metadata. This is a separate metadata exclusion, not an invented genre. The original events remain unchanged. `catalog/excluded-imports.json` records explicitly rejected source archives with a reason and date; their raw files and normalized records stay private, but the publisher omits them before any aggregation.

`<platform>/soundtrack/<period>` manifest entries hold compact genre, artist, and album datasets for the sticky listening-history picker. Last 30 days uses daily buckets, Last year (the rolling 365-day window) and calendar years use monthly buckets, and All time uses calendar years. Boundaries use Eastern Time. Rolling windows use the same exact timestamp cutoffs as history totals; the first and current day or month can be partial. Calendar years include all twelve months when records exist. Daily lines connect through zero-play days at the baseline, including pointer and keyboard inspection of zero counts; missing months and years remain as gaps. There is no independent granularity control.

Each bucket independently contributes its top five entries. Last 30 days includes single plays; other periods require at least 11 plays per bucket, with counts of 10 or fewer appearing as gaps only in this graph. Entries rank by plays and then normalized key for deterministic ties, retaining the union of bucket leaders. Future events, private sessions, kids genres, Disney music, and rejected imports are excluded first. Each distinct genre and credited artist receives one count per play; albums use normalized title and album-artist credits, including guest tracks. Missing metadata is omitted from that metric and counted explicitly. Per-platform aggregates remain available in the data.

Chart styles and legend entries rank by total qualifying plays across the selected range, with normalized keys breaking ties. The eight highest entries receive solid lines in a theme-aware chrome palette; later entries reuse the colors with dash patterns. Lines, legend swatches, and tooltip markers share the same assignment.

Graph clicks and keyboard selections open songs for the selected bucket; legend clicks open songs across the selected date range. Song files contain only that range's approved matching plays and per-bucket counts, retaining one-play songs and low-volume buckets without the graph cutoff. The song panel opens alongside the graph on desktop and over it on mobile. Changing the date range clears chart inspection and open songs while retaining the metric. The chart and history load together as one revision, preserving the saved view while fetching. Metric changes keep controls and SVG mounted. Pointer, tap, and keyboard inspection expose exact counts; overlapping points are grouped. Arrow keys navigate buckets and lines, Enter opens songs, and Escape dismisses details. Reduced motion skips transitions and responds to live preference changes. Period URLs and browser history remain supported.

## Spotify connection and collection

Graph details start closed. Touch inspection waits for a completed tap; movement or a canceled gesture leaves details closed, and tapping outside dismisses them. Focus alone does not open graph tooltips. Arrow keys still inspect chart values, and weekday buttons also open details with Enter or Space. The soundtrack crosshair appears only during inspection.

Track, album, and artist names use the shared `MusicLink` hover card, including soundtrack song lists and chart details. Soundtrack legend pills use plain labels without hover cards. The immutable `entities` dataset is loaded on the first interaction and cached for the page session. Genre, artist, and album song files are loaded on demand and carry their own approved hover metadata, with full all-time totals rather than the soundtrack graph's cutoff. Cards show all-time recorded listens, first/last recorded dates in Eastern Time, distinct tracks for artists/albums, approved artwork and genres, and measured duration when known. Affinity favorites without dated plays show zero recorded listens and no invented dates. Private library membership alone never seeds a public entity. Album totals use the provider's album-artist credits when available, combining tracks with guest recording artists.

Hover totals are computed from the entire approved history. The browser receives details only for music referenced by public rankings, soundtrack lines, affinity favorites, current playback, and their artist/album relationships. Private canonical events retain the full collection for future aggregations.

The featured record and current rotation use Spotify’s short-term affinity ranking. The featured track stays above the six rotation cards, which show ranks 2 through 7 without a separate selector. The record spins slowly with extra vertical space, stopping for reduced motion. Rotation artwork uses two columns on mobile, three on tablets, and six on desktop.

Known Spotify IDs link directly to the appropriate track, album, or artist; missing IDs use a Spotify search. Cards open on hover/focus, allow the pointer to enter the card, and dismiss with Escape or outside interaction. Close buttons appear in mobile and touch layouts and are hidden in desktop hover mode. Down Arrow moves keyboard focus into the card; a first touch previews it and the card's Spotify link opens the item. Floating cards are portaled outside clipped/animated lists, stay within the viewport, and follow the existing reduced-motion and theme preferences. The normal links remain useful without JavaScript.

Use Node 24 and the existing linked Netlify project. Authorization Code with PKCE needs no client secret. Register `http://127.0.0.1:8888/callback/spotify` in the Spotify app, then:

```powershell
npm run music:auth -- --client-id YOUR_CLIENT_ID
```

Open the printed local `/start` URL. Read-only scopes cover recent plays, favorites, library, followed artists, playlists, and playback state. The callback verifies OAuth state and saves the grant privately without printing it. Reauthorize if Spotify expires or revokes the grant.

```powershell
npm run music:sync
npm run music:sync -- --recent
npm run music:sync -- --recent --backfill
npm run music:aggregate
```

Full sync paginates supported top tracks/artists for every period, saved tracks/albums/shows/episodes/audiobooks, followed artists, playlists and contents, and artist genres. Unsupported endpoints are recorded. Rate limits are honored. The first genre collection can take time; production genre requests are bounded and checkpointed. Failed collections retain all completed raw pages and the last public summary.

## Artist image catalog

`catalog/artist_images.json` in the private music store, mirrored locally at `.music/catalog/artist_images.json`, keeps Spotify artist IDs, names, image URLs and dimensions, and retrieval dates. It is runtime metadata, separate from the committed genre catalog. Local sync and the scheduled worker update the same catalog; `music:pull --all` includes it, and `music:push` merges by retrieval date so an older local photo cannot replace a newer production photo.

Image collection covers artists with **more than 50 cumulative recorded plays** across the available platforms, after source deduplication and the existing public-history exclusions, plus all credited artists in active, non-private Now Playing playback regardless of play count. It does not create listening events. Fresh Spotify images replace the artist's saved value. Empty or unavailable responses preserve existing images. Archived ranking photos bootstrap missing entries, then missing photos are requested from the artist endpoint, prioritizing Now Playing. Artists without a known Spotify ID use name search only when it identifies one unambiguous matching artist, treating `and` and `&` spellings as equivalent. Ambiguous names are left unresolved.

Optional artist requests retry rate limits, server errors, and network failures up to three attempts, honoring `Retry-After` and backing off between attempts. Long or persistent rate limits save a shared cooldown and defer further optional lookups without failing collection or publication. Empty artist-image responses wait a day before another lookup; failed lookups wait 15 minutes, or one minute for Now Playing. Images remain unavailable if Spotify supplies none and the catalog has no prior photo.

Publication prefers supplied Spotify images and falls back to the saved catalog for artist rankings, soundtrack chart metadata, lazy song details, hover cards, and the Now Playing artists. It publishes only the existing approved entity metadata, never the complete catalog or its lookup state. Artists below the collection threshold can still display a photo already supplied by a Spotify ranking.

## Local artist genre catalog

`content/artist_genres.json` is the committed primary source for artist genres, separate from Spotify's private `catalog/genres.json`. Publishing and scheduled collection use this file's nonempty, usable labels first and fall back to Spotify when the artist is absent or has no usable labels. This resolution applies to history, soundtrack graphs, genre song lists, hover metadata, and kids filtering. Scheduled jobs only read this file; new classifications reach production with the next code deployment.

All genres used in published JSON follow the same rules: omit labels containing the word `christmas`, extract `christian` from compound labels, and replace `worship` and `ccm` with `christian`. Keep any remaining style and deduplicate the result. For example, `christian alternative rock` becomes `christian`, `alternative rock`; `lo-fi worship` becomes `lo-fi`, `christian`; `worship` or `ccm` alone becomes `christian`. Existing `christian` labels are not duplicated. These rules apply when updating the committed catalog and when resolving Spotify metadata, without rewriting private source records. Removing a Christmas label does not remove the listening event. Extra qualifier tags can bring a generated classification above five labels.

The local utility uses your installed Codex CLI and saved login (`codex login status`), with no OpenAI API key or additional npm dependency. It first pulls current production Spotify catalogs and canonical listening partitions through the existing Netlify connection. It skips original ZIPs, raw responses, credentials, and unrelated production state. Local listening partitions are merged, preserving local-only events. It does not initiate a Spotify library sync or write to production.

```powershell
npm run music:genres -- --dry-run
npm run music:genres
npm run music:genres -- --limit all
npm run music:genres -- --expand-singles --limit all
npm run music:genres -- --artist "Owl City" --artist "half•alive"
```

Discovery tracks only artists with **more than 25 cumulative recorded listens** (at least 26), registering their existing Spotify genres or an empty pending entry. Lower-count entries are pruned from this file and rediscovered on later runs if they become eligible; their original Spotify metadata stays in the private catalog. Counts span all available Spotify history after source deduplication, excluding private sessions, non-music, future records, and rejected imports. Eligible artists with no Spotify genres and no saved classification are sent to Codex, one at a time. Explicit `--artist` selections and retries do not bypass this threshold. Spotify genres remain usable at any listen count, independently of this file. The default limit is 25 eligible artists per run, prioritizing this year's recorded plays, then all-time plays. Codex receives only the artist's name, Spotify ID, and up to three example recording titles/albums to disambiguate identity, never listening counts, dates, source records, or credentials. Its ephemeral, read-only session runs in a temporary directory without user/project configuration or connected apps. It can use cached web search when uncertain.

Codex returns **2-5 distinct raw genre labels**, ordered from most representative to least. The response schema and local validator enforce that range before applying any custom transformations. An empty list with an explanation is allowed when the artist cannot be identified confidently or two genres cannot be supported. The local utility then applies the shared genre rules: remove Christmas labels, separate Christian styles, replace worship/CCM with christian, and deduplicate. Equivalent hyphen/space spellings follow the existing Spotify vocabulary. The saved list may contain fewer than two labels after merging, or more than five after separating qualifiers. These normalized labels are atomically saved before the next artist is requested.

Artists with exactly one saved genre are also queued, including those whose tag came from Spotify. Codex receives that genre and is asked for **1-2 additional genres**. The shared rules run before merging. The existing genre remains first, followed by at most two new normalized labels; equivalent spacing/hyphen variants are not new additions. `--expand-singles` targets only this pass. The original source, date, and other metadata are preserved; `genreExpansion` records the original genre, additions, explanation, sources, date, model, and effort separately. Later discovery never overwrites an expanded list with Spotify's original one-tag response.

Codex classifications are explicitly labeled with provenance and a brief explanation; these are artist-level classifications, not song-level Spotify genres. Unknown artists retain an empty list and explanation rather than invented labels. If no supported addition survives the shared rules, the one-genre list stays intact and the attempt is recorded. Completed and uncertain entries are skipped on subsequent runs; `--retry-unknown` retries uncertain classifications and expansions with no additions. A failed request stops the run while preserving completed work. Ctrl+C stops the active request. Concurrent catalog writers are blocked by a temporary `.lock` file; remove a stale lock only after confirming the original process is no longer running.

The utility explicitly requests `gpt-6.1-terra` with `medium` reasoning effort by default and records both settings with each new Codex classification. Earlier entries keep their original provenance. `--no-pull` works from existing local data. `--discover-only` registers artists without calling Codex. `--dry-run` shows the queue without editing the committed catalog or calling Codex (the private input pull still runs unless disabled). `--model` and `--effort` override the model and reasoning effort; the selected model must support the requested effort. `--codex-bin` or `CODEX_BIN` supplies the native executable if it is not on PATH. `--artist` can be repeated to target specific artists. No automatic Git commits or deployment occur. Successful generation refreshes only local summaries.

Review the resulting diff, correct labels with `source: "manual"` when appropriate, then commit `content/artist_genres.json` alongside code as usual. Preserve its ordered labels, provenance, and unresolved entries. It must never contain listening events, counts, example recordings, or credentials.

## Historical exports

Request Spotify Account Data, Extended Streaming History, and Technical Log Information in Account Privacy, then confirm the email. Lifetime history can take 30 days to prepare. Google Takeout should include music library/uploads, playlists, history, and relevant My Activity in JSON. The Play Music transfer confirmation establishes library migration, not complete dated-history retention. Verify actual export coverage before presenting historical claims.

```powershell
npm run music:import -- C:\path\spotify-export.zip
npm run music:import -- C:\path\takeout.zip
npm run music:import -- C:\path\extracted-metadata --directory
```

ZIP originals are retained intact; JSON and CSV entries are parsed. Other metadata and music media remain in the archive. Reimports deduplicate events. Extended Spotify exports supersede overlapping standard exports, and exports supersede overlapping API coverage for public aggregation. All source records remain private. Recently-played API collection cannot guarantee recovery of missed history; use exports to backfill.

Large ZIPs are hashed, copied, and read as streams. Only JSON/CSV entries are decompressed; a discard decoder consumes audio entries without buffering or expanding them. Production transfers use file-backed Blobs and streamed, checksum-verified local downloads, avoiding whole-file buffers for multi-gigabyte archives. Original ZIPs remain content-addressed and unchanged.

The Spotify extended history export downloaded on November 26, 2026 covers 2013 through 2026 across 20 audio/video history JSON files. The original ZIP, its accompanying readme, and every source record are retained privately. Duplicate records are collapsed in the canonical history, and newer API records are preserved when the historical partitions are merged.

The combined `YouTube and YouTube Music` directory name is never evidence that a video is music. Music events require an explicit per-record YouTube Music/Google Play Music product marker, a music.youtube.com URL, or an unambiguous music-only source path. Ordinary watches and searches are retained privately. Uploaded-song and library CSVs supply verified title/artist/album metadata under `catalog/google-tracks.json.gz`; a matching video ID can enrich a music event. Uploader/channel names and playlist creation timestamps never supply recording artists or playback dates.

The November 26, 2026 export contains 1,590 upload records, 515 library-song records, older playlists, 52,673 watch-history entries, and My Activity/search data. Exactly 27 watch entries carry explicit YouTube Music markers, with no library-video-ID matches. No dated Google Play Music plays were found. These music markers can include non-music videos, so their source identifies the app without independently verifying the content. `catalog/music-policy.json` sets `requireGoogleLibraryMatch: true` to keep unverified YouTube Music events private; they remain available for later review or enrichment. Do not claim the archive recovers complete Play Music listening history.

The regular YouTube API cannot return listening history. Google's Data Portability API has regional eligibility requirements and is unavailable to US-associated accounts. This release does not claim a live Google listening-history connection. The raw import and canonical schema can accept another verified collector later.

## Production and local pulls

The CLI reuses your Netlify CLI login and `.netlify/state.json`; it does not create a hosting project. `NETLIFY_AUTH_TOKEN` can override the CLI login.

```powershell
# Bootstrap data and the explicitly authorized Spotify grant.
npm run music:push -- --credentials

# Download only small production summaries for local development.
npm run music:pull

# Also download all raw files, canonical events, and catalogs, excluding secrets.
npm run music:pull -- --all

# Merge additional local imports into production.
npm run music:push

# Manually refresh production.
npm run music:sync -- --prod
```

Push merges listening partitions and preserves production token rotation unless `--credentials` is supplied. Avoid simultaneous administrative writes. The scheduled worker has a conditional, expiring lock against overlapping scheduled jobs. Runs that arrive while a worker is active are skipped, including during the daily full sync.

Generate the internal worker key once and import it without committing or printing its value:

```powershell
node --experimental-strip-types scripts/music.ts job-key
npx netlify env:import .music/job.env
```

`music-schedule` runs every minute and starts the authenticated background worker. Recent plays and `/me/player` playback state are collected every run; full library and affinity snapshots refresh once per UTC day. Frequent collection reduces gaps in Spotify's limited recent-history window. `state/job.json` records job outcomes. Large imports run locally, outside the scheduler's time limit.

The Music page requests a fresh manifest every 60 seconds while visible, and immediately on returning to the tab or reconnecting. It downloads only changed immutable datasets and commits the selected period, Spotify favorites, soundtrack graphs, and playback as one revision. Failed/overlapping requests retain the previous view; later selections abort earlier requests. Cached dataset memory is bounded. The manifest uses `Cache-Control: no-store`; hashed datasets remain immutable. Publishing reuses unchanged summary files even when the collection timestamp changes.

The public Spotify favorites snapshot is also saved in `localStorage` under `imjosh.in:music:spotify:v1`. On hydration, a valid cached snapshot at least as recent as the bundled snapshot restores the featured record, current rotation, and their artwork before the network refresh completes. Successful refreshes replace this cache only when its contents change. Corrupt or unavailable storage falls back to the bundled collection, and failed requests retain the saved view. Playback and private source records are not included in this cache. The vinyl label uses a plain black placeholder without text when artwork is missing.

The dismissible currently-listening toast uses the public `playback` dataset. It appears at the bottom right on desktop and spans the bottom on mobile. Mobile placement uses a 16 px bottom gap and follows larger safe-area or visual-viewport obstructions. Playback has no expiry: legacy `expiresAt`, observation age, and estimated track end do not hide a song. A confirmed pause or successful empty Spotify playback response clears it. Unavailable or incomplete updates retain the last confirmed playback, including in the published dataset so page reloads preserve the same state. Explicit private sessions and non-music/local playback clear the public song without publishing their metadata. New eligible songs update the open toast. Dismissal uses local React state, so new songs and background refreshes do not reopen it; a page reload resets dismissal. Only explicit active, non-private Spotify track playback can introduce or update a song. Current playback has no genre, kids, or Disney content filters; listening totals, charts, and rankings retain their exclusions. Playback observations do not create listening events or measured listening time. Device details, playback progress, and full API responses remain private. The existing read-only grant already includes playback-state access.

Track changes keep the toast container, currently-listening label, animated bars, and dismiss button mounted. Only the artwork and song details fade out and back in. Toast arrival and dismissal retain their slide animation; reduced motion skips all transitions.

Charts, open tables, selected buckets, legend highlights, and hover cards stay mounted during background refreshes. Counts in the history, rankings, and soundtrack legends use rolling digit counters that can increase or decrease and retarget from the current frame. Numbers inside chart tooltips and music hover cards render immediately, without counter animations. Reduced motion snaps animated counters to final values; polite toast announcements occur only when the playing track changes.

`/api/music?file=manifest.json` lists the immutable dataset files the browser can request. The endpoint accepts only that manifest and hashed dataset filenames from the public store. A new manifest is published after all its datasets are written. Local development reads the pulled `public/music/` mirror, including offline. The build runs `music:prepare` and preserves the Windows RSC filename normalization.

Spotify API use remains subject to its developer policy, including derived-metric restrictions. Export-based listening counts and Spotify's affinity rankings have distinct provenance. Do not present affinity rankings as play counts.
