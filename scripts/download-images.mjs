#!/usr/bin/env node
// Downloads the photos chosen for the new site from the current WordPress
// media library into src/assets/, so Astro can resize them and serve
// AVIF/WebP. Screenshots saved as PNG are converted to high-quality JPEG
// originals to keep the repository small.
//
//   node scripts/download-images.mjs          # skips files already present
//   node scripts/download-images.mjs --force  # downloads everything again
//
// Every photo was reviewed by eye before being added here. Photos in the
// WordPress library that look AI-generated or are screenshots of text were
// deliberately left out.

import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const UPLOADS = 'https://transforminternational.ca/wp-content/uploads/';
const force = process.argv.includes('--force');

/** local path (under src/assets/) → WordPress upload path */
const MANIFEST = {
  'logo/transform-logo-ca.png': '2025/03/Final-Transform-logo-CA-.png',

  // Youth Trades, Rwanda (Friends Peace House) — professional shoot
  'photos/youth-trades/mechanics-workshop.jpg': '2024/11/Screen-Shot-2024-01-25-at-10.27.12-AM.png',
  'photos/youth-trades/baker.jpg': '2024/11/Screen-Shot-2024-01-25-at-10.21.45-AM-2.png',
  'photos/youth-trades/masonry.jpg': '2024/11/Screen-Shot-2024-01-25-at-10.22.46-AM.png',
  'photos/youth-trades/kitchen.jpg': '2024/11/Screen-Shot-2024-01-25-at-10.23.09-AM.png',
  'photos/youth-trades/engine-repair.jpg': '2024/11/060261899e9fef2b-scaled.jpg',

  // Street Business School, Burundi (THARS)
  'photos/burundi/graduation-2026.jpg': '2026/04/Picture1.jpg',
  'photos/burundi/training-session.jpg': '2024/09/Thars1-e1727468209143.jpg',
  'photos/burundi/coaching-circle.jpg': '2024/09/Thars2-e1727468182941.jpg',
  'photos/burundi/shopkeeper.jpg': '2024/09/Thars3.jpg',
  'photos/burundi/young-shopkeeper.jpg': '2024/09/Thars5-e1725549537612.jpg',
  'photos/burundi/bread-oven.jpg': '2024/09/Thars8-e1725549580324.jpg',

  // Rwanda Rising (ACSD, Nyamasheke District)
  'photos/rwanda/boarding-graduates.jpg': '2024/09/boarding-graduates-2.jpg',
  'photos/rwanda/street-connected-children-2026.jpg': '2026/06/street-kids-Screenshot-2026-06-01-060831.png',
  'photos/rwanda/students-2026.jpg': '2026/06/kids-Screenshot-2026-06-01-060936.png',
  'photos/rwanda/weighing-children.jpg': '2023/08/weighing-kids-scaled.jpg',
  'photos/rwanda/nursery-porridge.jpg': '2023/08/Smiling-nursery-kids-with-porridge.png',
  'photos/rwanda/tailor-shop-opening.jpg': '2023/08/our-girls-at-opening-of-their-tailor-shop-.jpg',

  // Malawi — STREAMS, RDP Pads
  'photos/malawi/streams-health-workers.jpg': '2024/08/Nurses-e1725372187794.png',
  'photos/malawi/handwashing-station.jpg': '2019/02/IMG_6302.jpeg',
  'photos/malawi/rdp-pads-sewing.jpg': '2024/11/0086C779-33F6-4557-8184-7546A4480EE6_1_100_o-scaled.jpg',

  // Open Hands Education Trust, Bihar, India
  'photos/india/sewing-school.jpg': '2026/03/IMG_0020-scaled-e1772637822551.jpeg',
  'photos/india/school-children.jpg': '2026/03/IMG-20250902-WA0023.jpeg',

  // Clean water at St Paul's school ("Clean Water is a Blessing")
  'photos/water/students-at-tank.jpg': '2025/03/nice-grouping-under-tank-scaled.jpg',
};

/** Tighter crops of downloaded photos: new file → [source, { left, top, width, height }]. */
const CROPS = {
  // The graduation photo without the empty stage floor in its lower third.
  'photos/burundi/graduation-2026-wide.jpg': ['photos/burundi/graduation-2026.jpg', { left: 0, top: 40, width: 1386, height: 640 }],
};

let done = 0;
for (const [local, remote] of Object.entries(MANIFEST)) {
  const dest = join(ROOT, 'src/assets', local);
  if (!force && existsSync(dest)) continue;
  const res = await fetch(UPLOADS + remote);
  if (!res.ok) throw new Error(`${remote}: HTTP ${res.status}`);
  const input = Buffer.from(await res.arrayBuffer());
  await mkdir(dirname(dest), { recursive: true });
  const isJpegTarget = local.endsWith('.jpg');
  const out = isJpegTarget && !remote.match(/\.jpe?g$/i)
    ? await sharp(input).flatten({ background: '#ffffff' }).jpeg({ quality: 90, mozjpeg: true }).toBuffer()
    : input;
  await writeFile(dest, out);
  done++;
  console.log(`✓ ${local}`);
}
for (const [local, [source, region]] of Object.entries(CROPS)) {
  const dest = join(ROOT, 'src/assets', local);
  if (!force && existsSync(dest)) continue;
  await sharp(join(ROOT, 'src/assets', source)).extract(region).jpeg({ quality: 90, mozjpeg: true }).toFile(dest);
  console.log(`✓ ${local} (cropped)`);
}
console.log(`${done} downloaded, ${Object.keys(MANIFEST).length - done} already present.`);
