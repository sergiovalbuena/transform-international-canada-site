#!/usr/bin/env node
// Exports pages, posts and media metadata from the current WordPress site
// into scripts/wp-export/*.json. This is the starting point of the full
// content migration: run it again whenever the old site changes.
//
//   node scripts/import-wp.mjs

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://transforminternational.ca/wp-json/wp/v2';
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'wp-export');

/** Fetches every page of a WP collection (the API caps per_page at 100). */
async function fetchAll(type) {
  const items = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`${API}/${type}?per_page=100&page=${page}`);
    if (!res.ok) throw new Error(`${type} page ${page}: HTTP ${res.status}`);
    items.push(...(await res.json()));
    const totalPages = Number(res.headers.get('x-wp-totalpages') ?? 1);
    if (page >= totalPages) break;
  }
  return items;
}

/** Keeps only the fields useful for the migration, to keep the export readable. */
const slimPost = (p) => ({
  id: p.id,
  slug: p.slug,
  link: p.link,
  date: p.date,
  modified: p.modified,
  parent: p.parent,
  title: p.title?.rendered,
  excerpt: p.excerpt?.rendered,
  content: p.content?.rendered,
  featured_media: p.featured_media,
  categories: p.categories,
});

const slimMedia = (m) => ({
  id: m.id,
  slug: m.slug,
  date: m.date,
  title: m.title?.rendered,
  alt_text: m.alt_text,
  caption: m.caption?.rendered,
  mime_type: m.mime_type,
  source_url: m.source_url,
  width: m.media_details?.width,
  height: m.media_details?.height,
  filesize: m.media_details?.filesize,
  post: m.post,
});

await mkdir(OUT, { recursive: true });

for (const [type, slim] of [
  ['pages', slimPost],
  ['posts', slimPost],
  ['media', slimMedia],
]) {
  const items = (await fetchAll(type)).map(slim);
  await writeFile(join(OUT, `${type}.json`), JSON.stringify(items, null, 2) + '\n');
  console.log(`${type}: ${items.length} items → scripts/wp-export/${type}.json`);
}
