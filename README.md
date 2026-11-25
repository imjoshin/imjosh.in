# imjosh.in

Josh Johnson’s personal site, rebuilt from the **Option B / Liquid Chrome** design handoff using Next.js App Router, React, TypeScript, and Tailwind CSS.

## Develop

Use Node.js 24 (see `.nvmrc`) and npm.

```sh
npm ci
npm run dev
```

The site has three routes: `/`, `/uses/`, and `/resume/`. Photography opens [jj.photos](https://www.jj.photos). Fonts are self-hosted, and all pages are statically rendered. No CMS, environment variables, database, or application server is required.

```sh
npm run check   # strict TypeScript checks and Uses regression tests
npm run build   # production static export in out/
npm start      # preview the export
```

## Content and design

- `docs/design/` contains the original supplied handoff, reference prototype, scripts, and twelve screenshots. The prototype runtime is not bundled or deployed.
- `content/uses.ts` retains the original gear history and Josh’s confirmed updates, preserving exact dates when supplied. `src/lib/uses.ts` derives eight inventory categories and the acquisition/retirement event log. Historical snapshots show inventory at the end of the selected month.
- The Uses scrubber moves continuously without snapping, with animated year/month labels and month-specific changes. Arrow keys move one month; Shift + arrows move one year. Shareable `?month=2020-04` URLs and browser history work without reloads; existing `?year=2014` links still open year-end snapshots. It defaults to the visitor’s current month.
- `content/resume.ts` contains verified LinkedIn roles, dates, and summarized responsibilities, replacing the handoff’s placeholders. Its comments record the sources and verification date.
- `src/lib/blob.js` preserves the handoff’s chrome shading, with independent gravitational particles in `src/lib/blob-physics.ts`. The pointer acts as an additional gravity source. Clicks hit-test the visible surface and affect only that bubble and its connected group, using a surface-gap threshold that matches the chrome blend. Their velocity impulses ease in over roughly 55 ms, with local shape changes and gradual recovery. An order-independent exponential surface blend keeps joins smooth across different sizes and burst states. Empty-space clicks do not burst bubbles. A single lazy-loaded canvas persists across routes and hidden-tab pauses.
- Each starting bubble has a persistent root identity and volume. Clicking an isolated root splits it into equal half-volume pieces, down to one sixteenth of its root's volume over four split levels. Minimum-size pieces only move. Attached different roots separate as whole blobs. After a short cooldown, touching fragments from the same root merge smoothly until the exact starting count and sizes return. Volume is conserved, and complete roots cannot over-merge. Rendering supports up to 128 pieces, with a lower capacity on devices with limited WebGL uniforms and an adaptive pixel budget for larger fragment counts.
- On inner pages, the background blurs and eases to 4% of homepage speed, with pointer interaction disabled. Returning Home eases it back to full speed and clears the blur. Internal links animate page exits and entrances according to Home → Uses → Resume order. Direct visits, refreshes, and untyped history navigation do not run page transitions. The header and canvas remain outside the transition, and a reserved scrollbar gutter keeps the layout steady.
- Theme follows the operating system. The résumé’s **Save as PDF** action opens the browser print dialog with a print-specific layout.
- The 1200 × 630 social card uses the local Instrument Serif fonts with text on the left and chrome artwork on the right. `npm run generate:social` rebuilds `public/social.png` from `scripts/generate-social.mjs` and `public/social-art.svg`; production builds run this automatically. Metadata imports the image so its content hash refreshes the preview URL when the artwork changes.

The prior Gatsby source is preserved locally in ignored `.legacy-gatsby/` and in Git history. It is not used as a source of personal facts.

## Deploy to Netlify

The existing Netlify project is **imjoshin**, ID `6a5688c4-8c76-4dd5-afb1-1157eb780c56`, serving [imjosh.in](https://imjosh.in). Its production Git branch is `main`.

```sh
npx netlify link --id 6a5688c4-8c76-4dd5-afb1-1157eb780c56
npx netlify status
npm run deploy:preview
npm run deploy
```

`netlify.toml` sets `npm run build`, publishes `out/`, selects Node 24, and skips the Next.js server adapter because this is a static export. The old Gatsby build plugin has been removed from the Netlify project. Git pushes to `main` also trigger Netlify’s production build.

The build finishes by normalizing Next.js’s Windows RSC segment paths into the flat filenames the client router requests. This keeps client-side navigation working in local static previews and CLI deployments as well as Netlify’s Linux builds.

The runtime dependency audit is clean. The current Netlify CLI has upstream moderate advisories in its development-only glob dependencies; npm’s proposed automatic fix downgrades the CLI by twelve major versions, so it is not applied. These packages are not shipped in `out/`.

## Agent instructions

Canonical instructions live in `AGENTS.md`, with scoped guidance in `src/`, `content/`, and `docs/design/`. Each corresponding `CLAUDE.md` is stored in Git as a relative symbolic link to `AGENTS.md`.

On Windows checkouts with `core.symlinks=false`, Git represents symlinks as small files containing the target path. Enable Windows Developer Mode and clone with `core.symlinks=true` if native filesystem links are needed. The Git symlink entries remain valid on Linux and macOS.
