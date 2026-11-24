# Handoff: imjosh.in redesign ("Liquid Chrome")

## Overview
A redesign of imjosh.in, a personal site with three routes:
- `/`: the hero. A huge serif "I'm Josh*in'*" sits over animated purple/blue chrome blobs rendered with WebGL.
- `/uses`: the gear history from 2010 to now, browsed with a year scrubber.
- `/resume`: work experience, education and a quote.

Photography is an external link to jj.photos. Writing has been **removed**.

## About the design files
Everything in `reference/` is an **HTML design reference**: a prototype that shows the intended look and behavior. It is not production code. Rebuild it in the site's stack. The current site is Gatsby; Astro or Next.js are both fine choices. Use the stack's normal patterns.
- **Keep as-is:** `scripts/blob.js` is the exact renderer. It is framework-agnostic and can be used unchanged.
- **Prototype-only:** `reference/support.js` and the `.dc.html` format belong to the prototyping tool. Don't port them.

## Fidelity
**High-fidelity.** Match the colors, type, spacing and motion exactly. Screenshots of every page, in light and dark mode, with and without blobs, are in `screenshots/`.

## Files
```
handoff.md                     ← this file
scripts/blob.js                ← WebGL metaball renderer (production-ready, ~150 lines, no deps)
scripts/useBlob.tsx            ← React wrapper (<BlobCanvas dimmed />)
scripts/uses.ts                ← pure function: event log + year → categories & changes
reference/data.js              ← Uses event log, specs, categories, resume jobs (extracted from prototype)
reference/Josh Site.dc.html    ← full prototype (open in a browser alongside support.js)
screenshots/NN-<page>-<theme>-<blobs|noblobs>.png
```

---

## Design tokens

Themes follow the OS setting only, via `prefers-color-scheme`. There is **no manual toggle**. Implement the colors as CSS variables on `html[data-theme]` or in a media query.

| token | light | dark | use |
|---|---|---|---|
| `--bg` | `#eceaf3` | `#0c0b12` | page background |
| `--ink` | `#15131d` | `#edebf5` | primary text, pill borders, filled buttons |
| `--mute` | `#5d5a6c` | `#a09db2` | secondary text, labels |
| `--line` | `rgba(21,19,29,.16)` | `rgba(237,235,245,.15)` | hairlines, row hover fill |
| `--acc` | `#5b45d6` | `#a597ff` | accent: "in'", rotating word, roles, "new" tag, range input |
| `--panel` | `rgba(236,234,243,.74)` | `rgba(16,15,24,.70)` | translucent cards (use with `backdrop-filter: blur(14px)`) |

Fade `background` and `color` on `html` and `body` over `.4s` when the theme changes.

**Fonts (Google Fonts):**
- **Instrument Serif** 400, regular and italic: display and headline text.
- **Bricolage Grotesque** (opsz 12..96) at 400, 500 and 600: everything else.

**Type scale:**
- Hero h1: Instrument Serif 400, `clamp(84px, 17.5vw, 320px)`, line-height `.8`, letter-spacing `-.04em`.
- Page h1 (Uses, Resume): `clamp(56px, 9vw, 128px)`, line-height `.85`, letter-spacing `-.03em`. The second word is italic in `--acc`.
- Uses year display: Instrument Serif, `clamp(80px, 12vw, 168px)`, tabular numbers.
- Hero subline: Bricolage 400, `clamp(20px, 2.1vw, 30px)`, line-height 1.25, max-width 26ch.
- Section labels: Bricolage 600, 12px, letter-spacing `.1em`, uppercase, in `--mute`.
- Social links: Bricolage 500, 13px, letter-spacing `.06em`, uppercase.
- Logo "imjosh.in": Instrument Serif italic, 28px.

**Shape:**
- Pills: radius 999, 1px solid `--ink` border, padding `10px 18px`, 14px/500 text.
- Cards: radius 20 (24 on Resume), 1px `--line` border, `--panel` background with a blur.
- No shadows anywhere. The depth comes from the blobs.

**Spacing:**
- Horizontal page gutter: `clamp(20px, 4vw, 56px)`.
- Inner pages are centered: max-width 1240px on Uses and 1120px on Resume, top padding `clamp(24px, 5vw, 72px)`.

---

## Screens

### Global header (sticky, z above canvas)
- Logo on the left, linking to `/`.
- Pills on the right: **Uses**, **Resume**, **Photography ↗** (opens `https://www.jj.photos` in a new tab).
- Padding is `22px` vertically and the page gutter horizontally.
- Pill hover: background `--ink`, text `--bg`, `.2s` transition.
- Pill background is `--panel` with a 10px blur, so they stay readable over the blobs.

### Home (`/`), screenshots 01–04
- The layout is a full-viewport flex column, justified to the bottom.
- **h1:** `I'm Josh` + `<em style="color:--acc">in'</em>`.
- **Row below the h1:** `space-between`, wraps.
  - Left: "Hey! I'm passionate about solving **[rotating word]** problems and currently work at [tern.travel](https://tern.travel)." The link is underlined, 1px thick, offset 5px.
  - Right, stacked and right-aligned: the italic serif tagline "nah, he's alright." in `--mute`, then the social links: GitHub, LinkedIn, Instagram, Twitter, Facebook. The URLs are in `reference/Josh Site.dc.html`.
- **Rotating word:** a vertical slot machine that cycles `interesting → weird → stubborn → gnarly → fun → interesting`.
  - The word is in Instrument Serif italic, `--acc`.
  - The visible window is `1.25em` tall with `overflow:hidden`.
  - The word column moves with `translateY(-i*1.25em)`, `.65s cubic-bezier(.75,0,.2,1)`, every 2300ms.
  - The last item duplicates the first. When the column reaches it, wait 700ms, then jump to index 0 with `transition:none`. This makes the loop seamless.
- The text layer has `pointer-events:none`, except the links, so clicks reach the blob layer.

### Uses (`/uses`), screenshots 05–08
1. **Title row:** "What I *use*" with the subtitle "Every piece of gear since 2010. Drag through time." on the left. The selected year is shown huge on the right.
2. **Scrubber card:** `<input type=range min=2010 max=<current year> step=1>`, full width, `accent-color: --acc`. Tick labels below it at 2010, 2014, 2018, 2022 and 2026, in 13px `--mute`.
3. **Category grid:** `repeat(auto-fill, minmax(250px, 1fr))` with a 14px gap.
   - Categories: Desktop, Laptop, Monitors, Keyboard, Mouse, Camera, Lenses, Phone.
   - Each card has a header row with the label on the left and a two-digit count on the right (e.g. "02").
   - Items are listed newest first. Each has an 18px/500 name and an optional 14px `--mute` spec line.
   - Items added in the selected year get a **new** tag: 11px/600 uppercase, `--acc` background, `--bg` text, radius 999.
   - An empty category shows an italic serif "nothing yet" in `--mute`.
4. **"Changes in {year}" card:** a grid of rows, each with the month, `+` or `−`, and the item name.
   - Additions are in `--acc`. Removals are in `--mute` and struck through.
   - If the year has no changes, show "A quiet year. Nothing in, nothing out."

Data and logic: `scripts/uses.ts` and `reference/data.js`. The current year shows the full current inventory.

### Resume (`/resume`), screenshots 09–12
1. **Title row:** "Josh *Johnson*". The bio: "Engineer, sometimes product manager. I like building things that make people's lives easier. Ann Arbor, MI — a proud Yooper gone South."
   - Buttons: **LinkedIn ↗** is filled `--ink`, turning `--acc` on hover. **Save as PDF** is outlined and calls `window.print()`.
2. **Experience card:** one row per job.
   - Each row is a grid of `repeat(auto-fit, minmax(220px, 1fr))`. The company and dates take the left column; the role and blurb span two columns.
   - Company: Instrument Serif 36px. Dates: 14px `--mute`, tabular numbers. Role: 17px/600 `--acc`. Blurb: 17px, line-height 1.45.
   - Row hover fills with `--line`.
3. **Two cards side by side:** Education (Michigan Technological University, Houghton, MI) and Kind words (a quote from Vitaliy Peker).
4. **Print stylesheet:** hide the canvas and the header.

> ⚠ **Resume content needs verification.** LinkedIn couldn't be scraped. The company order is from Josh's GitHub bio. The years, the Tern title and most of the blurbs are placeholders in `reference/data.js` (`JOBS`). Replace them with the real LinkedIn data.

### Footer (inner pages only)
A hairline top border and a `--panel` blurred background. "imjosh.in" sits on the left in `--mute`, with the social links on the right.

---

## The blobs: how they're generated (`scripts/blob.js`)

There is a single full-screen **fragment-shader raymarcher** in raw WebGL1. There's no three.js, no geometry and no textures. The canvas is `position:fixed` behind everything with `pointer-events:none`. It listens to `pointermove` and `pointerdown` on `window`.

**Scene**
- Camera at `(0,0,4)`. Each ray is `normalize(vec3(uv, -1.6))`, where `uv = (fragCoord*2 - res) / res.y`.
- The scene contains 7 spheres. Each center drifts on Lissajous paths:
  `x = sin(t*.21 + i*1.9) * aspect * .95`, `y = cos(t*.17 + i*2.7) * 1.05`, `z = sin(t*.15 + i*1.3) * .6`.
- Radii are `.36 + .15*sin(i*2.1 + 1)`.
- The spheres merge with a polynomial **smooth-min**, `k = .8`, which produces the liquid joins.
- The march runs up to 84 steps, stopping when the distance drops below `.002` or exceeds 10.

**Mouse gravity**
- The pointer position is mapped to the world plane: `uv * 2.3`.
- It is lerped in JS at `.045` per frame, so it feels heavy and laggy.
- In the shader, each center moves toward the mouse by `(m - c) * pull / (1 + |m - c| * .35)`, with `pull = .24`. This is a gentle attraction that weakens with distance. The blobs never snap to the cursor.

**Click to break apart**
- `pointerdown` stores the click's world position and kicks a spring: `bv += .14`.
- Ignore clicks on `a`, `button` and `input`.
- Each frame the spring updates as: `bv += (0 - b) * .016; bv *= .93; b += bv`. This gives an underdamped burst lasting about 1.5s, then a slow re-merge.
- While `b > 0`:
  - Each center is pushed away from the click point along a jittered direction, by `b * (1.5 + 1.1*fract(i*.618))`.
  - The smooth-min `k` blends from `.8` down to `.1`, so the blobs visibly separate.
  - Radii shrink to 72%.

**Shading** (chrome with an iridescent purple/blue tint)
- Normals come from central differences.
- `fresnel = (1 - n·v)^2.4`.
- **Fake environment:** the reflection vector `r` is compared against a hard horizon at `r.y ≈ 0`. Below it is dark indigo; above it is a near-white sky; a bright band sits near the zenith. This gives the chrome "studio horizon" look.
- **Iridescence:** a constrained cosine palette, `vec3(.44,.40,.96) + vec3(.32,.27,.04) * cos(2π(k + vec3(0,.22,.5)))`. Here `k` depends on the normal, the fresnel and time, so the hue stays in the violet↔blue↔pink range and never goes green.
- **Final color:** `mix(env, env*irid*1.5, .6)`, plus a specular term `pow(r·L, 48)`, plus `irid * fresnel * .45`.
- **Background halo:** on a miss, the minimum distance along the ray gives a soft glow, `exp(-md*6)`. It is alpha 0.09 in light mode and 0.30 in dark mode, where it's tinted `#6b52ff`.
- **Dark mode:** `uDark` is lerped toward 1 (rate `.08`) whenever `<html data-theme="dark">`. It darkens the sky and raises the fresnel iridescence to `.75`.

**Performance**
- DPR is capped at 1.5, with total pixels capped at about 2.4M, which bounds the cost on 4K screens.
- A `ResizeObserver` keeps the canvas sized.
- The cleanup function cancels the animation frame and removes the listeners.

**Page behavior:** canvas opacity is 1 on Home and 0.5 on inner pages, transitioning over `.8s`. Mount one canvas at the app root so it persists across route changes and doesn't remount.

### Recommended additions (not in the prototype)
- **`prefers-reduced-motion`:** render a single still frame, or skip the canvas entirely. `useBlob.tsx` currently skips it.
- **Pause when hidden:** stop rendering on `visibilitychange`, or when the tab is hidden.
- **Fallback when WebGL is unavailable:** `initBlob` already returns a no-op. The page is designed to read fine without blobs (see the `*-noblobs` screenshots).
- **Lazy-load:** load `blob.js` after first paint. The hero text doesn't depend on it.

---

## State
- `route`: home, uses or resume. Use real routes in production; the prototype uses hash routing.
- `theme`: derived from `matchMedia('(prefers-color-scheme: dark)')`, with a listener for changes. Set `data-theme` on `<html>`, because the blob shader reads it.
- `wordIndex` and `snap`: drive the rotating-word slot.
- `year`: the Uses scrubber value, defaulting to the current year. Consider syncing it to `?year=` so it can be shared.

## Assets
No images. There are only Google Fonts and the shader. The old AI-generated hero image is removed.

## Prompt for your implementation agent
> Implement the imjosh.in redesign described in `design_handoff_imjosh_site/handoff.md`. Use `scripts/blob.js` verbatim for the background. Port `scripts/uses.ts` and `reference/data.js` for the Uses page. Match the screenshots in `screenshots/` pixel-for-pixel in both light and dark mode. Use real routes (`/`, `/uses`, `/resume`), remove Writing, and follow the "Recommended additions" section.
