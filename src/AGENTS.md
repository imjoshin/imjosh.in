# Application source

Follow the root instructions and design handoff. Pages and layouts are Server Components unless they need browser APIs. Keep the canvas mounted in the root layout across client navigation. Use semantic headings, native controls, Next.js links for internal navigation, and shared design tokens. Preserve the original chrome shading in `lib/blob.js` while using `lib/blob-physics.ts` for the user-requested independent particle gravity and inertial click bursts.

Inner pages blur the background, ease animation to a slow drift, and remove pointer listeners. Returning Home clears the blur and eases back up to full speed. Route changes and tab visibility must not reset particle positions or velocities. Keep page entrance animations outside the persistent background and header.

All three pages must remain readable with reduced motion and without WebGL. Do not add a theme switch; follow the OS. Keep print-specific résumé behavior in the global print stylesheet.
