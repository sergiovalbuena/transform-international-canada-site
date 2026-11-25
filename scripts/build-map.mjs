#!/usr/bin/env node
// Generates the simplified "Where we work" map from Natural Earth data
// (public domain, via the world-atlas package) into src/data/map.json.
// The site renders it as inline SVG, so no map service is loaded at runtime.
//
//   node scripts/build-map.mjs
//
// Only needs re-running if the map region or the highlighted countries change.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature, merge } from 'topojson-client';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = async (name) => JSON.parse(await readFile(require.resolve(`world-atlas/${name}`), 'utf8'));

const WIDTH = 1000;
// Africa, the Arabian peninsula and the Indian subcontinent.
// A MultiPoint (not a Polygon) avoids d3's spherical winding rules when fitting.
const REGION = {
  type: 'MultiPoint',
  coordinates: [[-19, -36], [92, -36], [92, 37], [-19, 37], [36, 37], [36, -36], [-19, 0], [92, 0]],
};

// ISO 3166-1 numeric codes of the countries we work in.
const HIGHLIGHT = { 108: 'burundi', 646: 'rwanda', 454: 'malawi', 356: 'india' };

const coarse = await load('countries-110m.json');
const fine = await load('countries-50m.json');

const projection = geoNaturalEarth1().fitWidth(WIDTH, REGION);
const [[, y0], [, y1]] = geoPath(projection).bounds(REGION);
const height = Math.round(y1 - y0);
projection.translate([projection.translate()[0], projection.translate()[1] - y0]);

const path = geoPath(projection).digits(1);
const inView = (f) => {
  const [[x0, ya], [x1, yb]] = path.bounds(f);
  return x1 > 0 && x0 < WIDTH && yb > 0 && ya < height;
};

// One merged land shape (no borders) keeps the map calm and the file small.
const nearby = coarse.objects.countries.geometries.filter((g) =>
  inView(feature(coarse, g)),
);
const land = path(merge(coarse, nearby));

// Small countries use the detailed 50m data; India is big enough for 110m.
const SMALL = new Set(['burundi', 'rwanda', 'malawi']);
const countries = Object.entries(HIGHLIGHT).map(([code, id]) => {
  const topo = SMALL.has(id) ? fine : coarse;
  const geom = topo.objects.countries.geometries.find((g) => Number(g.id) === Number(code));
  return { id, d: path(feature(topo, geom)) };
});

// Marker positions: the program locations named on the current site.
const places = {
  rwanda: [29.1, -2.4], // Nyamasheke District
  burundi: [29.92, -3.43], // Gitega
  malawi: [33.86, -11.02], // Rumphi District
  india: [84.6, 24.98], // Goh / Dadawan, Bihar State
};
const markers = Object.fromEntries(
  Object.entries(places).map(([id, lonLat]) => [id, projection(lonLat).map((n) => Math.round(n * 10) / 10)]),
);

await mkdir(join(ROOT, 'src/data'), { recursive: true });
const out = { viewBox: `0 0 ${WIDTH} ${height}`, land, countries, markers };
await writeFile(join(ROOT, 'src/data/map.json'), JSON.stringify(out) + '\n');
console.log(`map.json written (${(JSON.stringify(out).length / 1024).toFixed(1)} KB, ${WIDTH}×${height})`);
