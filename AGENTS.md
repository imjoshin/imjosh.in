# imjosh.in

This is Josh Johnson’s personal site, rewritten with Next.js App Router, React, TypeScript, and Tailwind CSS. It is a static export hosted on the existing Netlify site.

## Source of truth

- `docs/design/handoff.md` and its screenshots define Option B, **Liquid Chrome**. Match its typography, spacing, colors, and motion. The handoff is a design reference, not application source.
- `content/uses.ts` is the authoritative gear timeline. Preserve its dates, specifications, names, and retirement history. Derive the eight display categories from it; do not duplicate the prototype event log.
- Never infer personal facts from the previous Gatsby site. The handoff flags résumé dates, titles, and descriptions as placeholders. Publish only supplied or independently verified information; record provenance in `content/resume.ts`.
- No Writing page, old generated hero imagery, theme toggle, or prototype runtime. Photography links to `https://www.jj.photos`.
- Do not use em dashes in site copy, labels, or metadata. Rewrite the sentence or use a plain hyphen.
- Do not restore the removed professional tagline in copy, metadata, or images. Keep social preview text and blob artwork in separate, non-overlapping regions.

## Implementation

- Use real routes `/`, `/projects`, `/uses`, `/music`, and `/resume`. Keep React client components limited to interaction, browser state, and the persistent canvas.
- Use Tailwind utilities and shared CSS design tokens. Instrument Serif and Bricolage Grotesque are self-hosted through Fontsource.
- Preserve the chrome shading from `docs/design/scripts/blob.js`. The production renderer in `src/lib/blob.js` now uses the user-requested independent gravity simulation in `src/lib/blob-physics.ts`; the original archived script remains unchanged. Keep its canvas mounted across navigation, ease speed by route, and disable pointer listeners away from Home.
- Theme follows the operating system by default. For testing, `localStorage["imjosh.in:theme"]` may override it with `light` or `dark`; unset or invalid values follow the OS. Honor live changes to `prefers-color-scheme` and `prefers-reduced-motion`.
- Reserve the root scrollbar gutter. Use React ViewTransition boundaries in the App Router template for page exits and entrances, tagged by internal links according to Home → Projects → Uses → Music → Resume order. Direct visits and refreshes must not animate. Keep the header and live background outside capture (`html` has no view-transition name). Preserve client navigation and browser history.
- Music originals, credentials, and normalized events are private. Preserve all source records. Publish compact aggregates and approved metadata. Exclude tracks with kids genres from every public total, chart, and ranking, retaining them privately. Never infer listening time from track length or recording artists from YouTube uploader names.
- Artist genres use the committed `content/artist_genres.json` first, then Spotify when the catalog has no usable genres. Only the local `music:genres` utility or explicit edits update that catalog; scheduled jobs read it. Track and generate genres in that file only for artists with more than 25 cumulative recorded listens. Omit Christmas genres; split `christian` and `worship` out of compound labels into standalone, deduplicated genres. Preserve eligible artists' ordered genres, provenance, and unresolved entries.
- The Uses timeline is continuous (`step="any"`) with month-specific snapshots and animated year/month labels. Do not quantize the thumb when committing history. Preserve legacy year links and honor reduced motion.
- Preserve keyboard access, visible focus, labeled controls, responsive layouts, and useful no-WebGL/no-JavaScript fallbacks.
- Read the installed Next.js documentation in `node_modules/next/dist/docs/` when available before unfamiliar framework changes; use official docs as needed.
- Scoped `AGENTS.md` files add directory guidance. `CLAUDE.md` files are relative symlinks to the corresponding `AGENTS.md`; update the canonical files.

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
