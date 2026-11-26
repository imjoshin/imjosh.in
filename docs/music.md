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

Each distinct genre and credited artist receives one count per play; albums use normalized title plus sorted artist credits. Missing metadata is omitted from that metric and counted explicitly. The chart follows the platform selector but always spans all available seasons, independent of the history period selector. The legend supports highlighting, the season selector works by keyboard, and the data table exposes all counts. Monthly, weekday, and seasonal graphs expose exact counts on pointer inspection, tap, and keyboard focus. Monthly/weekday details also show their share of the selected period. Seasonal hit testing groups overlapping points; compact tooltips link the interaction to the full legend and table. Arrow keys navigate periods and lines, and Escape dismisses details. Periods, affinity covers, ranking tabs, and chart metrics use short exit/entrance transitions; reduced motion skips both the animations and their waiting interval.

## Spotify connection and collection

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

`music-schedule` runs every 5 minutes and starts the authenticated background worker. Recent plays are collected every run; full library and affinity snapshots refresh once per UTC day. Frequent collection reduces gaps in Spotify's limited recent-history window. `state/job.json` records job outcomes. Large imports run locally, outside the scheduler's time limit.

`/api/music?file=manifest.json` lists the immutable dataset files the browser can request. The endpoint accepts only that manifest and hashed dataset filenames from the public store. A new manifest is published after all its datasets are written. Local development reads the pulled `public/music/` mirror, including offline. The build runs `music:prepare` and preserves the Windows RSC filename normalization.

Spotify API use remains subject to its developer policy, including derived-metric restrictions. Export-based listening counts and Spotify's affinity rankings have distinct provenance. Do not present affinity rankings as play counts.
