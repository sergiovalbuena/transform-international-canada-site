#!/usr/bin/env node
// Checks that no content can stay invisible because of the scroll-reveal
// animation, and that no photo is used twice on a page. Runs at 375px with
// motion enabled. Start the preview first:  npm run build && npm run preview
//
//   node scripts/check-reveal.mjs          # the home page
//   node scripts/check-reveal.mjs /thars/  # other pages
//
// Exits with an error code if anything fails, so it can run in CI.

import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:4321';
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ['/'];
const VIEWPORT = { width: 375, height: 812 };
let failures = 0;

/** Every [data-reveal] element and every main section, with whether it is fully visible. */
const hiddenThings = () =>
  [...document.querySelectorAll('[data-reveal], main > section')]
    .filter((el) => {
      for (let node = el; node && node !== document.body; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (Number(style.opacity) < 0.99 || style.visibility === 'hidden' || style.display === 'none') return true;
      }
      return el.getBoundingClientRect().height === 0;
    })
    .map((el) => el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') + '.' + [...el.classList].join('.'));

async function scrollThrough(page, step = 350, pause = 120) {
  await page.evaluate(
    async ({ step, pause }) => {
      for (let y = 0; y <= document.documentElement.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, pause));
      }
    },
    { step, pause },
  );
}

function report(label, hidden) {
  if (hidden.length) {
    failures++;
    console.log(`  ✗ ${label}: ${hidden.length} element(s) still hidden`);
    hidden.slice(0, 8).forEach((h) => console.log(`      ${h}`));
  } else {
    console.log(`  ✓ ${label}`);
  }
}

const browser = await chromium.launch();

for (const path of pages) {
  console.log(`${path} @${VIEWPORT.width}px`);

  // 1. A visitor scrolls through the whole page.
  {
    const page = await browser.newPage({ viewport: VIEWPORT });
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await scrollThrough(page);
    await page.waitForTimeout(1500);
    report('scrolling through: everything visible', await page.evaluate(hiddenThings));

    // Each photo should appear only once on the page.
    const dupes = await page.evaluate(() => {
      const seen = new Map();
      for (const img of document.querySelectorAll('main img')) {
        const file = (img.currentSrc || img.src).split('/').pop() ?? '';
        const key = file.replace(/_[^_.]+\.(avif|webp|jpe?g|png)$/, ''); // drop the size suffix
        seen.set(key, (seen.get(key) ?? 0) + 1);
      }
      return [...seen].filter(([, n]) => n > 1).map(([k, n]) => `${k} ×${n}`);
    });
    if (dupes.length) {
      failures++;
      console.log(`  ✗ photos used more than once: ${dupes.join(', ')}`);
    } else {
      console.log('  ✓ every photo appears once');
    }
    await page.close();
  }

  // 2. A visitor jumps straight to the footer, then scrolls back up.
  {
    const page = await browser.newPage({ viewport: VIEWPORT });
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(400);
    await page.evaluate(async () => {
      for (let y = document.documentElement.scrollHeight; y >= 0; y -= 350) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
    });
    await page.waitForTimeout(1500);
    report('jump to the end, then scroll up: everything visible', await page.evaluate(hiddenThings));
    await page.close();
  }

  // 3. IntersectionObserver exists but never reports (a browser bug or extension).
  {
    const page = await browser.newPage({ viewport: VIEWPORT });
    await page.addInitScript(() => {
      window.IntersectionObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
          return [];
        }
      };
    });
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2600); // 1.5s fallback + the 0.7s fade
    report('observer never fires: fallback reveals everything', await page.evaluate(hiddenThings));
    await page.close();
  }

  // 4. JavaScript is off or fails to load.
  {
    const context = await browser.newContext({ viewport: VIEWPORT, javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    report('no JavaScript: everything visible', await page.evaluate(hiddenThings));
    await context.close();
  }
}

await browser.close();
if (failures) {
  console.log(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll checks passed.');
