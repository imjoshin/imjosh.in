# Gear product images

The product records and per-image source URLs are in `content/uses.ts`. Images are stored locally so the Uses page does not depend on third-party image hosts at runtime. Product photos illustrate the model; confirmed color variants are recorded below. Copyright remains with the respective image owners. Custom PC photos illustrate the named cases; the popover explicitly identifies them as case photos.

## Background removal

The built-in imagegen tool produced transparent cutouts for these nine assets from the original photos, preserving product design and screen content:

- `public/gear/lg-25um57.png`
- `public/gear/lg-29um67.png`
- `public/gear/lg-34gp63a.png`
- `public/gear/lg-banter-black.png`
- `public/gear/samsung-s7edge-black.png`
- `public/gear/razer-mamba.png`
- `public/gear/msi-ge60.png`
- `public/gear/apple-mbp-m4.png`
- `public/gear/lg-g4.png`

Prompt set: "Use case: background-extraction. Remove only the external background, floor reflection and graphics outside the product. Preserve the exact product geometry, proportions, colors, materials, logos, labels, controls and screen content. Keep the entire product in the original view on a fully transparent square canvas with modest padding. Do not redesign, relight, add or invent details. No background color, checkerboard or external shadow." For the Mamba image, the edit targeted the mouse in the center and removed surrounding marketing annotations.

Other images retain transparency from their source files. Source URLs and a `backgroundRemoved` marker are recorded on the relevant product.

## Research notes

- Existing configuration details and ownership dates remain authoritative, including the recorded resolution of the LG 34GP63A-B and the upgraded memory in the MSI laptop. Added model-level attributes do not replace those records.
- The two custom builds have no commercial release year. The iBUYPOWER RDY KING 95 PRO 009 release year could not be verified; its `releaseYear` remains `null`.
- Release years describe the product generation, not the purchase date. Configuration-specific colors, phone storage capacities and lens mounts are omitted unless supplied.
- Josh confirmed that the i7-4790K / GTX 970 build used a white NZXT H440. Its image and case color reflect that correction.

## Confirmed black variants

Josh confirmed that the Logitech MX Master 3S and every phone in the timeline were black. The mouse uses Logitech's black product photo. The Nexus 4, LG G4 and Pixel 6 Pro already depicted the black variants.

The built-in imagegen tool corrected product finishes in these existing transparent photos, preserving model geometry, logos, controls, camera layouts and screen content:

- `public/gear/lg-banter-black.png`
- `public/gear/samsung-s7edge-black.png`
- `public/gear/pixel2xl-black.png`
- `public/gear/pixel3xl-black.png`
- `public/gear/pixel7pro-black.png`
- `public/gear/pixel9pro-black.png`
- `public/gear/pixel11pro-black.png`

Prompt set: "Use case: precise-object-edit. Correct the pictured finish to the black variant. Preserve the exact model, geometry, proportions, perspective, materials, controls, lenses, logos, labels and screen content. Keep the entire product on a genuinely transparent background with modest padding. No invented features, external shadow or checkerboard." Pixel 2 XL and Pixel 3 XL use Just Black finishes; Pixel 7 Pro, Pixel 9 Pro and Pixel 11 Pro use Obsidian finishes; the Galaxy S7 Edge uses Black Onyx. For the LG Banter, isolate the central phone and make its colored outer frame black.

Original image source URLs remain on the product records, alongside a `colorAdjusted` marker for edited variants.
