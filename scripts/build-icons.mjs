#!/usr/bin/env node
// Builds the favicon set into public/ from one SVG: the nine letter colours of
// the TRANSFORM logo as stripes, with a cream "T" (the logo's first letter).
//
//   node scripts/build-icons.mjs
//
// Re-run if the brand colours change. Replace with a mark from the client's
// high-resolution logo files when they arrive.

import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), '../public');

// Letter colours of the logo, left to right: T R A N S F O R M.
const colours = ['#1e566d', '#642968', '#a81e24', '#a85828', '#d49529', '#0f4a27', '#186838', '#388848', '#5b9f6c'];
const stripe = 64 / colours.length;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs><clipPath id="r"><rect width="64" height="64" rx="14"/></clipPath></defs>
  <g clip-path="url(#r)">
    ${colours.map((c, i) => `<rect x="${(i * stripe).toFixed(2)}" width="${(stripe + 0.4).toFixed(2)}" height="64" fill="${c}"/>`).join('')}
    <rect width="64" height="64" fill="#082b17" opacity=".18"/>
  </g>
  <path d="M15 14h34v9.5H37.2V51H26.8V23.5H15z" fill="#fbf7f0"/>
</svg>
`;

await writeFile(join(PUBLIC, 'favicon.svg'), svg);

const png = (size) => sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();

// Apple touch icon: full-bleed (iOS rounds the corners itself).
const appleSvg = svg.replace('rx="14"', 'rx="0"');
await sharp(Buffer.from(appleSvg)).resize(180, 180).png().toFile(join(PUBLIC, 'apple-touch-icon.png'));
await writeFile(join(PUBLIC, 'icon-192.png'), await png(192));
await writeFile(join(PUBLIC, 'icon-512.png'), await png(512));

// favicon.ico containing a single 32×32 PNG (supported by every browser).
const ico32 = await png(32);
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // one image
header.writeUInt8(32, 6); // width
header.writeUInt8(32, 7); // height
header.writeUInt8(0, 8); // palette
header.writeUInt8(0, 9); // reserved
header.writeUInt16LE(1, 10); // colour planes
header.writeUInt16LE(32, 12); // bits per pixel
header.writeUInt32LE(ico32.length, 14); // image size
header.writeUInt32LE(22, 18); // image offset
await writeFile(join(PUBLIC, 'favicon.ico'), Buffer.concat([header, ico32]));

await writeFile(
  join(PUBLIC, 'site.webmanifest'),
  JSON.stringify(
    {
      name: 'Transform International (Canada)',
      short_name: 'Transform',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
      theme_color: '#fbf7f0',
      background_color: '#fbf7f0',
      display: 'browser',
    },
    null,
    2,
  ) + '\n',
);

console.log('Icons written to public/');
