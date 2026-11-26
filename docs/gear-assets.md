# Gear product images

The product records and per-image source URLs are in `content/uses.ts`. Images are stored locally so the Uses page does not depend on third-party image hosts at runtime. Product photos illustrate the model, not Josh's owned unit or its color. Copyright remains with the respective image owners. Custom PC photos illustrate the named cases; the popover explicitly identifies them as case photos.

## Background removal

The built-in imagegen tool produced transparent cutouts for these nine assets from the original photos, preserving product design and screen content:

- `public/gear/lg-25um57.png`
- `public/gear/lg-29um67.png`
- `public/gear/lg-34gp63a.png`
- `public/gear/lg-banter.png`
- `public/gear/samsung-s7edge.png`
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
