// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';

// The public address of the site. Netlify sets URL automatically for each
// deploy; the fallback is the organization's real domain.
const site = process.env.SITE_URL ?? process.env.URL ?? 'https://transforminternational.ca';

// Old web addresses that moved. vercel.json is the one list to edit: Vercel
// answers these with real 301 redirects, and Astro also writes a small
// "this page has moved" file for each one, so they work on any host and in
// `npm run preview`.
/** @type {{ redirects: { source: string; destination: string }[] }} */
const vercel = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'));
const redirects = Object.fromEntries(
  vercel.redirects.map((r) => [r.source.replace(/\/$/, ''), { status: /** @type {301} */ (301), destination: r.destination }]),
);

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site,
  trailingSlash: 'always',
  output: 'static',
  redirects,
  integrations: [sitemap()],
  image: {
    responsiveStyles: true,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
