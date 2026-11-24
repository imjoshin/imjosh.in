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
- `content/uses.ts` preserves the original gear timeline unchanged. `src/lib/uses.ts` derives eight inventory categories and the acquisition/retirement event log. Historical snapshots show inventory at the end of the selected year.
- The Uses scrubber supports pointer and keyboard input, clickable year labels, shareable `?year=2014` URLs, and browser back/forward history. It defaults to the visitor’s current year.
- `content/resume.ts` contains verified LinkedIn roles, dates, and summarized responsibilities, replacing the handoff’s placeholders. Its comments record the sources and verification date.
- `src/lib/blob.js` is an exact copy of the handoff renderer. A single lazy-loaded canvas persists across routes. Its React wrapper handles system theme changes, reduced motion, hidden tabs, WebGL fallback, and GPU cleanup.
- Theme follows the operating system. The résumé’s **Save as PDF** action opens the browser print dialog with a print-specific layout.

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

The runtime dependency audit is clean. The current Netlify CLI has upstream moderate advisories in its development-only glob dependencies; npm’s proposed automatic fix downgrades the CLI by twelve major versions, so it is not applied. These packages are not shipped in `out/`.

## Agent instructions

Canonical instructions live in `AGENTS.md`, with scoped guidance in `src/`, `content/`, and `docs/design/`. Each corresponding `CLAUDE.md` is stored in Git as a relative symbolic link to `AGENTS.md`.

On Windows checkouts with `core.symlinks=false`, Git represents symlinks as small files containing the target path. Enable Windows Developer Mode and clone with `core.symlinks=true` if native filesystem links are needed. The Git symlink entries remain valid on Linux and macOS.
