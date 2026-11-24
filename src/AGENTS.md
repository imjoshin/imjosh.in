# Application source

Follow the root instructions and design handoff. Pages and layouts are Server Components unless they need browser APIs. Keep the canvas mounted in the root layout across client navigation. Use semantic headings, native controls, Next.js links for internal navigation, and shared design tokens. Keep the supplied shader unchanged in `lib/blob.js`.

All three pages must remain readable with reduced motion and without WebGL. Do not add a theme switch; follow the OS. Keep print-specific résumé behavior in the global print stylesheet.
