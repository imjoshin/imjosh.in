# Site analytics

Google Analytics 4 uses the **imjosh.in** property in the **imjoshin** account, managed by josh@imjosh.in. [Open Analytics](https://analytics.google.com/analytics/web/?authuser=1#/a333551290p566051714/reports/intelligenthome).

Set `NEXT_PUBLIC_GA_ID` in the Netlify production **builds** environment and in ignored `.env.local` for local builds. Next.js embeds public environment variables at build time, so changing the ID requires rebuilding. `.env.example` lists the available settings. The Google tag loads once after hydration, outside the persistent background and navigation transitions.

Collection is enabled only on `imjosh.in` and `www.imjosh.in` in production. Development, local exports, and deploy previews do not send analytics unless `NEXT_PUBLIC_GA_DEBUG=true` is explicitly set. Debug mode logs events in the browser console and marks them for GA DebugView; use a test property for local development. Do Not Track and Global Privacy Control disable site analytics. Google signals and ad personalization are disabled. Analytics blockers or a failed Google script do not affect site behavior.

## Reports

- **Reports > Acquisition**: users, sessions, referral sources, and campaign attribution.
- **Reports > Engagement > Pages and screens**: views and engagement for each route, including Music.
- **Reports > Engagement > Events**: the named interactions below.
- **Explore**: combine Event name with Chart, Chart metric, Listening period, Site section, Social network, Link placement, Input method, Item type, Public item name, Color theme, Gear month, Soundtrack bucket, Recording artists, Display rank, Item placement, and Item group.
- **Realtime / DebugView**: inspect incoming events during verification. Standard reports require processing time.

Custom definitions are event-scoped. `interaction_count` is a custom metric with Standard units. Sum it to count actual blob bursts, Pew shots, and Pew hits; GA's ordinary Event count counts their five-second batches. Other events are sent individually.

## Event contract

| Events | Meaning and useful parameters |
| --- | --- |
| `page_view` | One per initial route and client route change, including browser back/forward. Filter and timeline URL changes are not visits. Includes sanitized page location, title, and previous route. |
| `navigation_click` | Internal route link activation, with `link_url`, `link_text`, `link_location`, and `method`. |
| `outbound_click`, `social_click` | External HTTP(S) links, including photography, projects, Spotify songs/playlists, and social profiles. Social events add `social_network`. Touches that only open music detail cards do not count as outbound clicks. |
| `scroll_depth` | Once at each 25%, 50%, 75%, and 90% milestone per route visit, as `percent_scrolled`. Pages that fit the viewport are excluded. |
| `section_view`, `chart_view` | At least 10% of a section/chart remains visible for one second in the active tab. Deduplicated by context per route visit. Includes `section`, `chart`, `metric`, and `period` where applicable. |
| `chart_inspect` | An actual chart tooltip remains visible for 750 ms, including keyboard and touch inspection. Repeated inspection of the same context is limited to once per ten seconds. Merely moving over a chart is not inspection. |
| `music_item_hover` | A pointer stays over a music link, soundtrack legend entry, or playlist for 750 ms. Records the item and its source context. Quick passes, touch input, hidden tabs, and exiting rows do not count. Repeated hovers of the same context are limited to once per ten seconds. |
| `music_details_view` | A music detail card remains visible for 750 ms. Carries its original source context through the body portal, including `item_type`, `item_name`, `item_artists`, `item_rank`, `item_slot`, `item_group`, `section`, `chart`, `period`, `metric`, and `bucket` where applicable. `method` distinguishes hover, keyboard, touch, and click. The same ten-second repeat limit applies per complete context. |
| `music_period_change` | Choosing a history preset or year, with `period` and `method`. |
| `music_ranking_change`, `music_metric_change` | Changing favorites or soundtrack metric, with `metric`, `period`, and `chart` for the soundtrack. |
| `music_drilldown` | Opening songs from a soundtrack line, legend, or tooltip. Includes `chart`, `metric`, `period`, public `item_name`, and selected `bucket` (or `all`). |
| `now_playing_dismiss` | Dismissing the current playback toast. Playback polling itself is not a visitor action. |
| `blob_burst` | Successful surface hits only. Includes `method`, `affected_blobs`, and exact `interaction_count` per batch. Empty-space clicks and automatic physics splits are excluded. |
| `blob_gravity_grab` | Starting a right-button gravity grab. |
| `pew_mode_enable`, `pew_mode_disable` | Activation by typing the shortcut, and exit via Escape, navigation, or pausing. Only the recognized action is recorded, never typed characters. |
| `pew_shot`, `pew_hit` | Actual projectiles fired and actual surface impacts, batched with exact `interaction_count`. Hits also include `affected_blobs`. |
| `uses_period_change` | Committing a gear month, as `month`; continuous thumb motion is preserved. |
| `gear_details_view` | Opening gear details, with public `item_name`. |
| `theme_change`, `menu_open`, `resume_print` | Theme choice (`theme`), opening the mobile menu, or activating the existing print button. |

The web stream's **Enhanced measurement is off**. Pageviews, scroll milestones, and outbound clicks are explicitly measured by the site. Keep this setting off to avoid duplicate history-based pageviews and counting Music/Uses filter changes as visits. Basic GA automatic session and engagement events still apply.

URLs sent by site code omit credentials, fragments, and arbitrary query parameters. Page locations retain only UTM campaign parameters. Analytics never reads private music originals, credentials, normalized listening events, or browser storage contents. Music names come only from the public interface.

## Verification

`npm run check` includes Analytics regression coverage for configuration gates, URL sanitization, delayed queueing, duplicate pageviews, filter changes, browser history, batch counts, original-route attribution, and privacy preferences. `npm run build` verifies the static export.

For browser verification, set `NEXT_PUBLIC_GA_DEBUG=true` with a test measurement ID, start a separate development server, and inspect `[analytics]` console messages. Check initial navigation, Back, Music filters, chart dwell and tooltips, social links, real blob hits versus misses, typing `pew`, firing, and Escape. After deployment, verify the production tag on the live site and watch GA Realtime as the new property finishes initializing.


## Music inspection breakdowns

`music_item_hover` measures pointer interest in the source item. `music_details_view` measures an actual inspection of the floating details card, including keyboard and touch use. These are separate stages; do not add their counts together as unique interactions. Filter `music_details_view` to `method=hover` when comparing hover-opened cards with keyboard or touch inspection.

The source section is retained when a card is rendered directly under `body`, so the same item in two sections is distinguishable. A card changing item, section, period, or input method starts a new dwell interval. Outbound links inside the card retain its source context too.

| `section` | Source |
| --- | --- |
| `featured_music` | The large featured song |
| `artist_picks` | Artist recommendations and their all-time/recent song picks |
| `heavy_rotation` | Spotify's current rotation |
| `recent_tracks` | The recent track strip |
| `artist_history` | Artist names and seasonal heatmap inspections |
| `favorites` | Ranked tracks, albums, and artists in the selected period |
| `listening_curve`, `weekday`, `hourly` | Listening curve, weekday, and hourly chart inspections |
| `soundtrack` | The soundtrack chart, tooltip links, and legend |
| `soundtrack_songs` | A selected soundtrack line's song list |
| `season_unique` | Seasonal artist tables below the soundtrack chart |
| `now_playing` | The current playback toast |
| `playlists` | Spotify playlist links |

`item_artists` uses only the recording artists already supplied to the public interface. An artist item records its own name. This distinguishes songs or albums with the same name. `item_rank` is the displayed row or card position, not a new listening ranking; an artist link below a track retains that track row's position. Heatmap ranks are within their displayed group.

`item_slot` distinguishes covers, titles, artist names, legend entries, and playlists. `item_group` identifies all-time/recent recommendation picks, heatmap groups, and chart tooltip rows. `period`, `metric`, and `bucket` describe the data actually displayed, including while a new period is loading. Featured and rotation data use `spotify_short_term`; recommendations use `6m` or their song-specific window; recent and current playback use `recent` and `current`.

Weekday and hourly charts reuse `chart_view` and `chart_inspect`, with `chart`/`section` set to `weekday` or `hourly`, `metric=average_listening_time`, and the displayed `period`. Hourly inspection uses zero-padded Eastern hour buckets `00` through `23`; weekdays retain their full English names. Tooltips inherit the actual `hover`, `click`, `touch`, or `keyboard` method from the chart surface. Existing visibility, dwell, and repeat limits apply. These are new values for existing reportable parameters and need no additional custom definitions.

Season unique reuses `section_view`, `chart_view`, shared outbound links, `music_item_hover`, and `music_details_view`. The section is `season_unique`; enabled tables have `chart=season_unique`, `metric=artists`, and `bucket`/`item_group` set to `winter`, `spring`, `summer`, or `autumn`. Artist ranks are their displayed positions within that season. Context carries the history dataset's displayed period while a new selection loads and persists through hover-card portals. Disabled placeholders carry no artist metadata or chart exposure marker and cannot produce item interactions. No additional events, parameters, or GA custom definitions are needed.

In GA Explore, select `music_item_hover` or `music_details_view`, then break it down by **Site section**, **Item type**, **Public item name**, **Recording artists**, **Display rank**, **Item placement**, **Item group**, **Listening period**, **Chart metric**, **Soundtrack bucket**, and **Input method**.
