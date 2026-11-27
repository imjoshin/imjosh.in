# Gear product images

The product records and per-image source URLs are in `content/uses.ts`. Images are stored locally so the Uses page does not depend on third-party image hosts at runtime. Product photos illustrate the model; confirmed color variants are recorded below. Copyright remains with the respective image owners. Custom PC photos illustrate the named cases; the popover explicitly identifies them as case photos.

The Dell desktop, monitor, keyboard and mouse were used from 2008 until September 2013. Josh remembers a Pentium 4 tower with 256MB RAM but does not recall the exact models. At his request, real Dell products from the period provide approximate model names and photos. `modelApproximate` retains that provenance, and the details explain that the exact model is not recalled. Display names omit the “(approx.)” qualifier at Josh’s request. Peripheral specifications describe the reference products, rather than a confirmed identification of his equipment. The 2008 date retains year precision instead of assigning an acquisition month.

The Dimension 2400 reference is documented in Dell’s August 2003 setup guide and original owner’s manual. Its product photo comes from the ManualsLib model catalog. Processor and memory remain Josh’s remembered configuration; no clock speed, storage, graphics card or operating system is inferred.

The E773c CRT is documented by its May 2005 service manual. The listed 1024 × 768 at 85Hz mode is a supported preset, not a maximum or fixed native resolution. Its unmodified photo is by Matt Ross / CRT Database under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/), credited and linked in the details. The SK-8115 keyboard photo is by Maarten Tromp / geekabit; Dell’s accessibility documentation identifies the model and a November 2006 Dell discussion establishes the period. The M-UVDEL1 mouse photo is from Paladin’s Emporium’s exact-model listing; a May 2004 Dell discussion and a 2004 filed asset inventory establish its period. Peripheral release years remain unconfirmed.

## Nintendo consoles

Josh supplied the console ownership months and finishes on November 27, 2026. The Galaxy Style New Nintendo 3DS XL entry uses November 2016 following his model clarification. All retirements are stored in `content/uses.ts`; the UI does not enforce a console-count limit.

Nintendo technical references document the product specifications. Evan-Amos’s public-domain Wikimedia Commons photos illustrate the Nintendo 64 Fire Orange, Indigo GameCube, original Wii, Wii U, original Switch, Atomic Purple Game Boy Color, Indigo Game Boy Advance, original DS, and Aqua Blue 3DS. Unknown Wii/Wii U/controller colors and the DS’s blue reference finish are identified in the product details. Pictured game cartridges and memory cards are not configuration records. Fire Orange’s specific release year is unconfirmed; 1996 describes the Nintendo 64 platform.

The Polar White DS Lite photo is the published transparent derivative by User:Havok and Estoy Aquí, under [CC BY 2.5](https://creativecommons.org/licenses/by/2.5/), visibly credited in the details. Galaxy Style uses Nintendo’s product photo distributed with its August 2016 announcement, via Nintendo Life. Switch 2 uses Nintendo’s official console, dock, and Joy-Con 2 image. Source-provided thumbnails are cached locally without local image edits.

## Background removal

The built-in imagegen tool produced transparent cutouts for these eight assets from the original photos, preserving product design and screen content:

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

## November 2026 inventory additions

The AV display category groups microphones and webcams; Audio contains headphones and earbuds. Two earlier Amazon webcam purchases extend the history: HAVIT HV-N5086 on November 28, 2017, replaced by NexiGo N930AF on July 20, 2020, which was replaced by Logitech Brio 4K on September 12, 2022. Josh confirmed that each webcam replaced the previous one. The HAVIT photo is an exact-model retailer product image, and its original manual supplies the VGA specifications despite conflicting HD retailer claims. NexiGo’s comparison table and the purchased product listing establish the N930AF model; its photo and technical information come from NexiGo. Release years for both older webcams remain unconfirmed. No raw orders or financial details are published.

The black IKEA BEKANT corner desk was acquired in September 2018 and retired when the VIVO frame arrived on July 14, 2020, based on Josh’s supplied history. Its image comes from IKEA’s product catalog. The details identify the left-hand black-stained ash photo as a reference because the exact side and finish variant are unrecorded; height-adjustment type and dimensions are not inferred.

Josh bought the IKEA RENBERGET swivel chair in Bomstad black with the desk in September 2018 and supplied its IKEA product link to identify the model. IKEA’s product photo illustrates it; its release year remains unconfirmed. The Secretlab TITAN Evo in Cookies & Cream replaced it in November 2021. Secretlab’s July 2021 launch announcement documents the release year, SoftWeave Plus fabric and features, and its color guide supplies the official photo. Chair size is unspecified. Both chairs appear in Desk with month-level ownership dates.

The approved Amazon-backed additions use local, model-specific product photos with source URLs on each record. The Canon, LG, Samsung, Shure, Logitech and VIVO assets come from manufacturer sources. The Sennheiser and Pixel Buds photos come from retailer product imagery; the KZ image comes from its brand storefront. The Upperizon and AOOCOO images come from the exact public product listings. Photos retain their source backgrounds and are not generated substitutes. Release years stay unconfirmed unless verified independently of the purchase date.

The Upperizon export specifies 120Hz, 400 nits and 100% sRGB. Its current listing advertises different values, so the timeline preserves the purchased specifications and uses a dimension view without the conflicting marketing labels.

Ownership dates for the additions use the order timestamp converted to Eastern time. Josh confirmed the January 2026 desktop display replacement, retention of the portable monitor, independent replacement histories for over-ear headphones, earbuds and microphones, and ownership of the black VIVO frame only. No financial records or order identifiers are published.
