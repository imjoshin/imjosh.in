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

## Public exclusions and seasonal charts

Keep all originals and canonical events. Before aggregation, enrich genres and exclude every track with a kids genre. Every period, platform, total, favorite, and chart uses that filtered input. Provider affinity rankings use the same classification. Children's music, kids, nursery rhymes, lullabies, kindie, baby, toddler, preschool, and equivalents are matched as genre labels. Titles and artist names are not genre evidence. Unknown genres stay explicitly unclassified, with coverage counts in summaries. Reaggregation applies catalog improvements to historical records.

Disney/Pixar artist, title, album, and label credits, plus identified Disney soundtrack albums, are excluded even with missing genre metadata. This is a separate metadata exclusion, not an invented genre. The original events remain unchanged. `catalog/excluded-imports.json` records explicitly rejected source archives with a reason and date; their raw files and normalized records stay private, but the publisher omits them before any aggregation.

`<platform>/seasons` manifest entries hold independent, compact all-time datasets for genres, artists, and albums. Seasons follow Eastern Time: Spring March-May, Summer June-August, Fall September-November, Winter December-February. December belongs to the following year's winter. Each season independently contributes its top five, ranked by plays and then normalized key for deterministic ties. The chart retains their union, with each selected series' counts in every season, including zero counts between recorded seasons. It never selects just the all-time top five. Future events, private sessions, kids genres, Disney music, and rejected imports are excluded first.

Each distinct genre and credited artist receives one count per play; albums use normalized title plus sorted artist credits. Missing metadata is omitted from that metric and counted explicitly. The page combines all approved platforms. Platform attribution and per-platform aggregates remain available in the data, with no platform selector in the UI. The seasonal chart always spans all available seasons, independent of the history period selector. The legend supports highlighting, the season selector works by keyboard, and the data table exposes all counts. Monthly, weekday, and seasonal graphs expose exact counts on pointer inspection, tap, and keyboard focus. Monthly/weekday details also show their share of the selected period. Seasonal hit testing groups overlapping points; compact tooltips link the interaction to the full legend and table. Arrow keys navigate periods and lines, and Escape dismisses details. History panels stay mounted across period changes. Period datasets are cached by immutable filename; the old values remain visible until a requested dataset is ready. Counts interpolate, weekday bars resize, monthly and seasonal lines morph from their current geometry, and keyed ranking rows and affinity covers move or enter/leave individually. New selections retarget in-flight animations. Seasonal metric changes retain the chart controls and SVG. Reduced motion skips transitions and responds to live preference changes. Period URLs and browser history work without platform parameters; legacy platform parameters are removed.

## Spotify connection and collection

Graph details start closed. Touch inspection waits for a completed tap; movement or a canceled gesture leaves details closed, and tapping outside dismisses them. Focus alone does not open graph tooltips. Arrow keys still inspect chart values, and weekday buttons also open details with Enter or Space. The seasonal crosshair appears only during inspection.

Track, album, and artist names use the shared `MusicLink` hover card, including seasonal inspectors, tables, and chart details. Seasonal legend pills use plain labels and highlight or pin chart lines without opening hover cards. The immutable `entities` dataset is loaded on the first interaction and cached for the page session. Cards show all-time recorded listens, first/last recorded dates in Eastern Time, distinct tracks for artists/albums, approved artwork and genres, and measured duration when known. Affinity favorites without dated plays show zero recorded listens and no invented dates. Private library membership alone never seeds a public entity. Album totals use the provider's album-artist credits when available, combining tracks with guest recording artists.

Hover totals are computed from the entire approved history. The browser receives details only for music referenced by public rankings, seasonal lines, affinity favorites, current playback, and their artist/album relationships. Private canonical events retain the full collection for future aggregations.

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

The Music page requests a fresh manifest every 60 seconds while visible, and immediately on returning to the tab or reconnecting. It downloads only changed immutable datasets and commits the selected period, Spotify favorites, seasonal graphs, and playback as one revision. Failed/overlapping requests retain the previous view; later selections abort earlier requests. Cached dataset memory is bounded. The manifest uses `Cache-Control: no-store`; hashed datasets remain immutable. Publishing reuses unchanged summary files even when the collection timestamp changes.

The dismissible currently-listening toast uses the public `playback` dataset. It appears at the bottom right on desktop and spans the bottom on mobile. Mobile placement uses a 16 px bottom gap and follows larger safe-area or visual-viewport obstructions. Playback has no expiry: legacy `expiresAt`, observation age, and estimated track end do not hide a song. A confirmed pause or successful empty Spotify playback response clears it. Unavailable or incomplete updates retain the last confirmed playback, including in the published dataset so page reloads preserve the same state. Explicit private sessions and non-music/local playback clear the public song without publishing their metadata. New eligible songs update the open toast. Dismissal uses local React state, so new songs and background refreshes do not reopen it; a page reload resets dismissal. Only explicit active, non-private Spotify track playback can introduce or update a song. Current playback has no genre, kids, or Disney content filters; listening totals, charts, and rankings retain their exclusions. Playback observations do not create listening events or measured listening time. Device details, playback progress, and full API responses remain private. The existing read-only grant already includes playback-state access.

Charts, open tables, selected seasons, legend highlights, and hover cards stay mounted during background refreshes. Counts in the history, rankings, and seasonal tables use rolling digit counters that can increase or decrease and retarget from the current frame. Numbers inside chart tooltips and music hover cards render immediately, without counter animations. Reduced motion snaps animated counters to final values; polite toast announcements occur only when the playing track changes.

`/api/music?file=manifest.json` lists the immutable dataset files the browser can request. The endpoint accepts only that manifest and hashed dataset filenames from the public store. A new manifest is published after all its datasets are written. Local development reads the pulled `public/music/` mirror, including offline. The build runs `music:prepare` and preserves the Windows RSC filename normalization.

Spotify API use remains subject to its developer policy, including derived-metric restrictions. Export-based listening counts and Spotify's affinity rankings have distinct provenance. Do not present affinity rankings as play counts.
