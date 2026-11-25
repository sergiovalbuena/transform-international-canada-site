#!/usr/bin/env node
// Full-page screenshots for visual review, plus a console-error check.
// Start the production preview first:  npm run build && npm run preview
//
//   node scripts/shots.mjs                 # all pages, 375/768/1024/1440px
//   node scripts/shots.mjs / /thars/       # only these pages
//
// Screenshots are saved to screenshots/ (ignored by git).

import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:4321';
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ['/', '/donate/', '/thars/', '/streams/', '/who-we-are/', '/stories/'];
const widths = (process.env.WIDTHS ?? '375,768,1024,1440').split(',').map(Number);

await mkdir('screenshots', { recursive: true });
const browser = await chromium.launch();
let problems = 0;

for (const width of widths) {
  // Reduced motion makes every reveal and counter show its final state.
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  for (const path of pages) {
    const page = await context.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        problems++;
        console.log(`  console error on ${path} @${width}: ${msg.text()}`);
      }
    });
    page.on('pageerror', (err) => {
      problems++;
      console.log(`  page error on ${path} @${width}: ${err.message}`);
    });
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    // Scroll to the bottom so lazy images load.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) {
      problems++;
      console.log(`  horizontal overflow of ${overflow}px on ${path} @${width}`);
    }
    const name = (path === '/' ? 'home' : path.replace(/\//g, '-').replace(/^-|-$/g, '')) + `-${width}.png`;
    await page.screenshot({ path: `screenshots/${name}`, fullPage: true });
    console.log(`✓ ${name}`);
    await page.close();
  }
  await context.close();
}

await browser.close();
console.log(problems ? `${problems} problem(s) found.` : 'No console errors or overflow.');
