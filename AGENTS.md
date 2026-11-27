# imjosh.in

This is Josh Johnson’s personal site, rewritten with Next.js App Router, React, TypeScript, and Tailwind CSS. It is a static export hosted on the existing Netlify site.

## Source of truth

- `docs/design/handoff.md` and its screenshots define Option B, **Liquid Chrome**. Match its typography, spacing, colors, and motion. The handoff is a design reference, not application source.
- `content/uses.ts` is the authoritative gear timeline. Preserve its dates, specifications, names, and retirement history. Derive eleven display categories in this order: Desktop, Monitors, Keyboard, Mouse, Laptop, Phone, Camera, Lenses, Desk, Audio, Consoles. Audio includes microphones while preserving their separate source records and replacement history. Wide layouts have rows of four, four, and three cards; center the final row with the same card widths as the others. Do not duplicate the prototype event log. The January 2026 monitor upgrade retires the previous desktop displays while keeping portable displays. Over-ear headphones, earbuds, and microphones each have one active item at a time, with replacements retaining their historical entries. Console retirement dates are explicit content records: home consoles replace earlier home consoles, portables replace earlier portables, and the July 2017 Switch replaces both. Do not implement console replacement as a UI filter.
- Never infer personal facts from the previous Gatsby site. The handoff flags résumé dates, titles, and descriptions as placeholders. Publish only supplied or independently verified information; record provenance in `content/resume.ts`.
- No Writing page, old generated hero imagery, or prototype runtime. Photography links to `https://www.jj.photos`.
- Do not use em dashes in site copy, labels, or metadata. Rewrite the sentence or use a plain hyphen.
- Do not restore the removed professional tagline in copy, metadata, or images. Keep social preview text and blob artwork in separate, non-overlapping regions.

## Implementation

- Use real routes `/`, `/projects`, `/uses`, `/music`, and `/resume`. Keep React client components limited to interaction, browser state, and the persistent canvas.
- Use Tailwind utilities and shared CSS design tokens. Instrument Serif and Bricolage Grotesque are self-hosted through Fontsource.
- Preserve the chrome shading from `docs/design/scripts/blob.js`. The production renderer in `src/lib/blob.js` now uses the user-requested independent gravity simulation in `src/lib/blob-physics.ts`; the original archived script remains unchanged. Keep its canvas mounted across navigation, ease speed by route, and disable pointer listeners away from Home.
- Theme follows the operating system by default. The desktop-only navigation theme icon saves `light` or `dark` in `localStorage["imjosh.in:theme"]`; unset or invalid values follow the OS. Match the other navigation items' colors and hover styles, animate the sun/moon change, and keep it out of the mobile menu. Honor live changes to `prefers-color-scheme` and `prefers-reduced-motion`.
- Reserve the root scrollbar gutter. Use React ViewTransition boundaries in the App Router template for page exits and entrances, tagged by internal links according to Home → Projects → Uses → Music → Resume order. Direct visits and refreshes must not animate. Keep the header and live background outside capture (`html` has no view-transition name). Preserve client navigation and browser history.
- Music originals, credentials, and normalized events are private. Preserve all source records. Publish compact aggregates and approved metadata. Exclude tracks with kids genres from every public total, chart, and ranking, retaining them privately. Never infer listening time from track length or recording artists from YouTube uploader names.
- Artist photos are cached in the private `catalog/artist_images.json` (`.music/catalog/artist_images.json` locally). Collect only artists with more than 50 cumulative recorded plays or active public Now Playing playback. Supplied Spotify images replace saved photos; missing images use the saved catalog. Retry missing-image requests with rate-limit backoff, preserving cached photos and publication when optional metadata is unavailable.
- Artist genres use the committed `content/artist_genres.json` first, then Spotify when the catalog has no usable genres. Only the local `music:genres` utility or explicit edits update that catalog; scheduled jobs read it. Use Terra (`gpt-6.1-terra`) with Medium reasoning effort by default for Codex genre requests. Track and generate genres in that file only for artists with more than 25 cumulative recorded listens. Omit Christmas genres; split `christian` out of compound labels, and replace `worship` and `ccm` with `christian`, preserving the remaining style and deduplicating genres. Preserve eligible artists' ordered genres, provenance, and unresolved entries.
- The Uses timeline is continuous (`step="any"`) with month-specific snapshots and animated year/month labels. Do not quantize the thumb when committing history. Preserve legacy year links and honor reduced motion. Empty categories say “nothing yet” before their first acquisition and “nothing currently” after past ownership; determine history through the selected month, including retired items.
- Preserve keyboard access, visible focus, labeled controls, responsive layouts, and useful no-WebGL/no-JavaScript fallbacks.
- Read the installed Next.js documentation in `node_modules/next/dist/docs/` when available before unfamiliar framework changes; use official docs as needed.
- Scoped `AGENTS.md` files add directory guidance. `CLAUDE.md` files are relative symlinks to the corresponding `AGENTS.md`; update the canonical files.

## Analytics and event tracking

- `docs/analytics.md` is the event contract and reporting guide. Keep it current when adding or changing interactions. Use the existing GA4 property and Netlify site; keep `NEXT_PUBLIC_GA_ID` in build environment settings or ignored `.env.local`, never hardcode its value in source.
- `src/components/site-analytics.tsx` owns the single Google tag, route pageviews, delegated link clicks, scroll milestones, and qualified exposure/hover tracking. Keep it mounted once in the root layout. Enhanced measurement stays off in GA so automatic history events do not duplicate pageviews or count Music/Uses filters as visits.
- Send explicit actions through `trackEvent` from `src/lib/analytics.ts`. Reuse an existing event when its meaning matches; otherwise add a stable `snake_case` name to `AnalyticsEvent` and document its trigger and parameters. Record completed actions in their handlers, not renders, animation frames, playback polling, or metadata refreshes. Navigation, outbound links, and scroll depth already have shared tracking; avoid duplicate instrumentation.
- Use `data-analytics-view="section_id"` for section exposure, `data-analytics-chart="chart_id"` for chart exposure, and `data-analytics-section="section_id"` for context without an extra exposure event. Use stable identifiers rather than visible headings. Social profile links need `data-analytics-social="network"`. Actual chart tooltips use `data-analytics-inspect="chart"`; do not mark an entire chart as an inspection.
- Use `MusicLink` and `MusicArtists` for music entity links. They supply item metadata and qualified hover tracking. Custom music legend/playlist targets use `data-analytics-hover="music"` with their item metadata. Preserve source `section`, `item_type`, `item_name`, `item_artists`, displayed `item_rank`, `item_slot`, and `item_group`, plus `period`, `metric`, `chart`, and `bucket` where applicable. Attribute the data actually displayed while a new selection is loading.
- Use the helpers in `src/lib/analytics-context.ts` to inherit context. Capture `musicInspectionContext` from the source anchor before opening a music card and carry it through the portal with `analyticsDataAttributes`. A portal under `body` cannot recover its original section by walking ancestors. The same item in different sections or periods must remain distinguishable. New context fields belong in the shared field list, observer attributes, reporting guide, and corresponding GA custom definitions.
- Preserve the qualification rules: section/chart views require at least 10% visibility for one second; music hovers and detail/chart inspections require 750 ms. Repeated hovers/inspections are limited to once per ten seconds per complete context. Exclude hidden tabs and exiting/inert content. `music_item_hover` and `music_details_view` represent separate stages; distinguish hover, keyboard, touch, and click through `method`, and do not sum both events as unique interactions.
- Use `countEvent` for high-frequency blob bursts, Pew shots, and Pew hits. Preserve exact `interaction_count` values, five-second batching, original-route attribution, and flushing on navigation, tab hiding, and page exit. GA Event count counts batches; the custom Interaction count metric counts actual actions. Empty-space clicks and automatic physics splits are not successful visitor bursts.
- Preserve production-host gating, explicit test-only debug mode, Do Not Track/Global Privacy Control handling, and disabled advertising signals. Send only approved public metadata and sanitized URLs through the shared helpers. Never send credentials, private listening records, arbitrary URL queries, typed characters, pointer coordinates, or visitor-identifying information. Optional analytics failures must not interrupt site behavior.
- For tracking changes, run `npm run check` and `npm run build`, and verify meaningful payloads in the browser. Use a test measurement ID with `NEXT_PUBLIC_GA_DEBUG=true` for local/preview checks, restore production settings before publishing, and verify deployed events in GA Realtime. Add regression coverage for attribution, deduplication, or counting changes. New reportable parameters need corresponding custom dimensions or metrics in the existing GA property.

## Adding pages and features

- Create real App Router routes with page-specific metadata and canonical URLs. Keep pages as Server Components and add small client components only for interaction. Preserve static export support and the existing navigation, persistent canvas, accessibility, and reduced-motion behavior.
- Root analytics automatically records initial visits and pathname changes, including Back/Forward. Do not add a second pageview sender to a page. Add new routes to `routeTitles` in `src/lib/analytics.ts`, keeping titles aligned with page metadata so streamed navigation cannot report a stale title.
- Update the ordered routes in `src/lib/navigation.ts`, relevant links in `src/components/site-shell.tsx`, and `src/app/sitemap.ts`. Use `DirectionalLink` from `src/components/navigation-motion.tsx` for internal navigation and preserve directional page transitions.
- Give new meaningful sections, charts, links, and controls the appropriate analytics context and events as part of implementation. Verify one pageview for direct loads and client navigation, correct history/referrer behavior, and that query-only filters remain interactions rather than extra visits.

## Commands and release

- Use Node.js 24 and npm. Commit only `package-lock.json`; do not restore Yarn or Gatsby dependencies.
- `npm ci` installs the locked dependency tree; `npm run dev` starts local development.
- `npm run check` runs strict TypeScript checks and gear timeline regression tests.
- `npm run build` exports production routes into `out/`. `npm start` serves that export.
- `npm run generate:social` recreates `public/social.png` from the local Instrument Serif fonts and `public/social-art.svg` using `scripts/generate-social.mjs`. The build runs it automatically. Import the image in metadata so its URL includes a content hash when it changes.
- The postbuild script normalizes Next.js RSC segment filenames on Windows so exported client navigation works there as it does in Linux builds. Keep the normalization when changing the build command.
- Check desktop and narrow mobile layouts, OS light/dark modes, motion preferences, scrubber/history behavior, navigation, missing routes, and résumé print layout when changing UI.
- Use the local Netlify CLI (`npx netlify status`, `npx netlify deploy`) to inspect the existing site. The deploy command builds by default. `npm run deploy` publishes production when authorized. Do not create a second hosting project or change domains.
- Keep credentials, local Netlify state, build output, screenshots from test runs, and environment values out of Git.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
