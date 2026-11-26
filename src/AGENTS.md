# Application source

Follow the root instructions and design handoff. Pages and layouts are Server Components unless they need browser APIs. Keep the canvas mounted in the root layout across client navigation. Use semantic headings, native controls, Next.js links for internal navigation, and shared design tokens. Preserve the original chrome shading in `lib/blob.js` while using `lib/blob-physics.ts` for the user-requested independent particle gravity and inertial click bursts.

Inner pages blur the background, ease animation to 4% of homepage speed, and remove pointer listeners. Returning Home clears the blur and eases back up to full speed. Route changes and tab visibility must not reset particle positions or velocities. Keep page entrance animations outside the persistent background and header.

Hit-test clicks against the rendered surface. Apply eased velocity impulses and local burst shapes only to the clicked bubble and its connected component, using the surface-gap threshold. Empty-space clicks must not burst any bubbles. Keep gradual recovery and individual pointer gravity.

Preserve immutable root identities and volumes. An isolated root or its fragments can split into equal half-volume pieces, down to one thirty-second of the root's volume (five split levels). Attached different roots separate without further fragmentation. Minimum-size pieces still receive a velocity impulse. Same-root fragments coalesce on contact after a cooldown, conserving volume and restoring the original count and exact sizes; complete roots never over-merge. Ease the displayed volume and merge positions, and pass actual dynamic radii/counts to the shader. Keep CPU hit-testing and the shader's surface field in sync. Allow up to 128 fragments within the device's uniform limit, and lower the canvas pixel budget as fragment counts rise.

Use the order-independent exponential surface union and its analytic normals. Blend widths are properties of individual blobs; do not vary them with spatially blended radii or burst states, which creates creases in surface normals. Keep the conservative march distance and connection gap consistent with that field. Click impulses reach nearly full velocity in about 55 ms while preserving position and velocity at the instant of the click.

All pages must remain readable with reduced motion and without WebGL. Do not add a theme switch; follow the OS unless `localStorage["imjosh.in:theme"]` explicitly overrides it with `light` or `dark` for testing. Keep print-specific résumé behavior in the global print stylesheet.
