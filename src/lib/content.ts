import { getCollection, getEntry } from 'astro:content';
import type { givingPlaces } from '../content.config';

export type GivingPlace = (typeof givingPlaces)[number];

/** Site-wide settings (navigation, contact details, footer). */
export async function getSite() {
  const entry = await getEntry('site', 'site');
  if (!entry) throw new Error('Missing src/content/settings/site.json');
  return entry.data;
}

/** Suggested gifts and Zeffy donation forms. */
export async function getGiving() {
  const entry = await getEntry('giving', 'giving');
  if (!entry) throw new Error('Missing src/content/settings/giving.json');
  return entry.data;
}

/**
 * Suggested gifts that are switched on (`"published": true`) in giving.json,
 * optionally only those meant for one place (`showOn`) and one program.
 */
export async function getPublishedLevels(where?: GivingPlace, project?: string) {
  return (await getGiving()).levels.filter(
    (level) =>
      level.published &&
      level.amount !== null &&
      (!where || level.showOn.includes(where)) &&
      (!project || level.project.id === project),
  );
}

/** The home page's ordered list of blocks. */
export async function getHome() {
  const entry = await getEntry('home', 'home');
  if (!entry) throw new Error('Missing src/content/settings/home.json');
  return entry.data;
}

/** All programs, in the order set by each file's `order` field. */
export async function getProjects() {
  return (await getCollection('projects')).sort((a, b) => a.data.order - b.data.order);
}

/** The pages collection (About pages, What we do, Contact). */
export async function getPages() {
  return getCollection('pages');
}

/** All stories, newest first. */
export async function getStories() {
  return (await getCollection('stories')).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/**
 * Where a story card links: its own page (/stories/ plus the file name
 * without the date), or the `url` in the story file if one is set.
 */
export const storySlug = (id: string) => id.replace(/^\d{4}-\d{2}-\d{2}-/, '');
export const storyHref = (story: { id: string; data: { url?: string } }) => story.data.url ?? `/stories/${storySlug(story.id)}/`;

/** The web address of a program page, e.g. "/thars/". */
export const projectHref = (id: string) => `/${id}/`;

const money = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });
/** 1000 → "$1,000" */
export const formatMoney = (amount: number) => money.format(amount).replace('CA', '');

const dates = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
/** A date as "April 13, 2026". */
export const formatDate = (date: Date) => dates.format(date);

const numbers = new Intl.NumberFormat('en-CA');
/** 1344 → "1,344" */
export const formatNumber = (n: number) => numbers.format(n);

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Lets editors emphasize words in headings by wrapping them in asterisks:
 * "Your gift, *put to work*" → "Your gift, <em>put to work</em>". Everything
 * else is escaped, so content files can never inject HTML.
 */
export const emphasize = (text: string) => escapeHtml(text).replace(/\*(.+?)\*/g, '<em>$1</em>');

/**
 * Body text: **double asterisks** make words bold and *single* ones italic.
 * Everything else is escaped.
 */
export const rich = (text: string) =>
  escapeHtml(text)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label: string, href: string) => {
      // Links: [words](/page/), [words](#part), [words](https://…) or [words](mailto:…), [words](tel:…). Anything else stays as typed.
      if (!/^(\/(?!\/)|#|https:\/\/|mailto:|tel:)/.test(href)) return match;
      const external = href.startsWith('https://');
      return `<a href="${href}" class="link-underline"${external ? ' rel="noopener"' : ''}>${label}</a>`;
    })
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');

/** The same text with the asterisks removed, for page titles and alt text. */
export const plain = (text: string) => text.replace(/\*(.+?)\*/g, '$1');
