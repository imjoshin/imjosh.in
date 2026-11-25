import { readFile, writeFile } from 'node:fs/promises';
import { createElement as h } from 'react';
import { ImageResponse } from 'next/og.js';

const root = new URL('../', import.meta.url);
const [regular, italic, artwork] = await Promise.all([
  readFile(new URL('node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff', root)),
  readFile(new URL('node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff', root)),
  readFile(new URL('public/social-art.svg', root)),
]);

// Keep the entire text column left of x=744, with the artwork beginning at x=792.
const card = h('div', { style: {
  display: 'flex', width: 1200, height: 630, position: 'relative',
  background: '#0c0b12', color: '#f1eef8', fontFamily: 'Instrument Serif',
} },
  h('div', { style: { display: 'flex', position: 'absolute', left: 64, top: 48, fontSize: 38, fontStyle: 'italic' } }, 'imjosh.in'),
  h('div', { style: {
    display: 'flex', position: 'absolute', left: 60, top: 242, width: 684,
    fontSize: 176, lineHeight: 1, letterSpacing: -5, whiteSpace: 'nowrap',
  } }, "I'm Josh", h('span', { style: { color: '#b09aff', fontStyle: 'italic' } }, "in'")),
  h('div', { style: { display: 'flex', position: 'absolute', left: 67, top: 474, fontSize: 36, color: '#aaa4ba' } }, 'Josh Johnson'),
  h('img', { src: `data:image/svg+xml;base64,${artwork.toString('base64')}`, width: 380, height: 510,
    style: { display: 'flex', position: 'absolute', left: 792, top: 62 } }),
);

const response = new ImageResponse(card, {
  width: 1200, height: 630,
  fonts: [
    { name: 'Instrument Serif', data: regular, weight: 400, style: 'normal' },
    { name: 'Instrument Serif', data: italic, weight: 400, style: 'italic' },
  ],
});
await writeFile(new URL('public/social.png', root), Buffer.from(await response.arrayBuffer()));
console.log('Generated public/social.png (1200 x 630).');
