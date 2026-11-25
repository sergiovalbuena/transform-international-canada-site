#!/usr/bin/env node
// Lighthouse (mobile) and axe accessibility checks against the production
// preview. Start it first:  npm run build && npm run preview
//
//   node scripts/audit.mjs            # home, donate and /thars/
//   node scripts/audit.mjs /stories/  # a specific page
//
// Full Lighthouse HTML reports are written to reports/ (ignored by git).

import { mkdir, writeFile } from 'node:fs/promises';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:4321';
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ['/', '/donate/', '/thars/'];
await mkdir('reports', { recursive: true });

console.log('Lighthouse (mobile)');
const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new'] });
for (const path of pages) {
  const result = await lighthouse(BASE + path, { port: chrome.port, output: 'html', logLevel: 'error' });
  const { categories, audits } = result.lhr;
  const score = (k) => Math.round(categories[k].score * 100);
  const bytes = audits['total-byte-weight']?.numericValue ?? 0;
  console.log(
    `  ${path.padEnd(12)} Performance ${score('performance')} · Accessibility ${score('accessibility')} · ` +
      `Best Practices ${score('best-practices')} · SEO ${score('seo')} · ` +
      `LCP ${audits['largest-contentful-paint'].displayValue} · CLS ${audits['cumulative-layout-shift'].displayValue} · ` +
      `weight ${(bytes / 1024).toFixed(0)} KiB`,
  );
  for (const [id, audit] of Object.entries(audits)) {
    if (audit.score !== null && audit.score < 0.9 && audit.scoreDisplayMode === 'binary') console.log(`      ✗ ${id}: ${audit.title}`);
  }
  const name = path === '/' ? 'home' : path.replace(/\//g, '-').replace(/^-|-$/g, '');
  await writeFile(`reports/lighthouse-${name}.html`, result.report);
}
await chrome.kill();

console.log('axe (WCAG 2.2 AA)');
const browser = await chromium.launch();
for (const path of pages) {
  for (const width of [375, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .exclude('iframe')
      .analyze();
    console.log(`  ${path} @${width}: ${violations.length ? violations.length + ' issue(s)' : 'no issues'}`);
    for (const v of violations) console.log(`      ✗ ${v.id} (${v.nodes.length}): ${v.help} → ${v.nodes[0].target.join(' ')}`);
    await context.close();
  }
}
await browser.close();
