#!/usr/bin/env node
// Writes .pages.yml, the configuration for the Pages CMS content editor
// (https://pagescms.org), from the content files themselves.
//
//   node scripts/pages-config.mjs           # write .pages.yml
//   node scripts/pages-config.mjs --check   # check that saving in Pages CMS can't lose data
//   node scripts/pages-config.mjs --simulate  # rewrite every content file the way a
//                                             # Pages CMS save would (for testing; revert after)
//
// Run it again whenever you add, remove or rename a section, a home page block
// or a program, so the editor shows the new fields.
//
// How the editor is set up
// - Each program, About page, the home page, the gift levels and the site
//   settings is one fixed form. Sections and home page blocks are named
//   entries in the files (see `keyed` in src/content.config.ts), so the form
//   shows one group of fields per section: volunteers can edit the text but
//   can't add, remove or reorder sections.
// - Only text volunteers will realistically edit is shown. Everything else
//   (colours, anchors, layout switches, photo crop positions) is left out and
//   kept when the file is saved, because settings.content.merge is on.
//
// Two Pages CMS behaviours this script guards against (checked in the Pages CMS
// source, June 2026):
// 1. When a file is saved, lists are replaced wholesale, so every key of every
//    item in a list must be in the form, or it is deleted. Lists of objects
//    therefore get a field for every key found in the data (technical ones
//    hidden). --check verifies this for every file.
// 2. Empty values ("" , empty lists, empty objects) are removed on save, so the
//    site's schemas must treat a missing value the same as an empty one.

import { readFileSync, writeFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { parse, stringify } from 'yaml';

const MODE = process.argv[2] ?? '--write';

// ---------------------------------------------------------------------------
// Reading content files
// ---------------------------------------------------------------------------
function readEntry(path) {
  const raw = readFileSync(path, 'utf8');
  if (path.endsWith('.json')) return { data: JSON.parse(raw), body: null };
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`No frontmatter in ${path}`);
  return { data: parse(m[1]) ?? {}, body: m[2] };
}

const plain = (s = '') => String(s).replace(/\*+/g, '').replace(/\s+/g, ' ').trim();
const clip = (s, n = 60) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

const configSource = readFileSync('src/content.config.ts', 'utf8');
const icons = configSource.match(/export const icons = \[([^\]]*)\]/)[1].match(/'([^']+)'/g).map((s) => s.slice(1, -1));
const iconLabels = {
  water: 'Water drop', sanitation: 'Sanitation', hygiene: 'Hygiene (hands)', food: 'Food', energy: 'Energy',
  skills: 'Skills (tools)', heart: 'Heart', gift: 'Gift', hands: 'Helping hands', megaphone: 'Megaphone',
  school: 'School', home: 'Home', book: 'Book',
};

const projectFiles = globSync('src/content/projects/*.md').sort();
const projects = projectFiles
  .map((path) => ({ path, id: path.split('/').pop().replace(/\.md$/, ''), ...readEntry(path) }))
  .sort((a, b) => a.data.order - b.data.order);

// Which photo folder the editor opens first for each program.
const photoFolder = {
  burundi: 'burundi',
  rwanda: 'rwanda',
  malawi: 'malawi',
  india: 'india',
};
const programFolder = (p) => (p.id === 'youth-trades' ? 'youth-trades' : photoFolder[p.data.country]);

// ---------------------------------------------------------------------------
// Field builders
// ---------------------------------------------------------------------------
const MARKUP = 'Put **double asterisks** around words to make them bold, and write [the words](/page/) to make a link.';
const HEADING = 'Put *single asterisks* around a word or two to show them in the accent colour.';

const f = {
  string: (name, label, description, extra = {}) => ({ name, label, type: 'string', ...(description && { description }), ...extra }),
  text: (name, label, description, extra = {}) => ({ name, label, type: 'text', ...(description && { description }), ...extra }),
  number: (name, label, description, extra = {}) => ({ name, label, type: 'number', ...(description && { description }), ...extra }),
  boolean: (name, label, description) => ({ name, label, type: 'boolean', ...(description && { description }) }),
  image: (name, label, folder, description) => ({
    name,
    label,
    type: 'image',
    ...(description && { description }),
    options: { media: 'photos', ...(folder && { path: `src/assets/photos/${folder}` }) },
  }),
  object: (name, label, fields, description) => ({ name, label, type: 'object', ...(description && { description }), fields }),
  list: (field, extra = {}) => ({ ...field, list: Object.keys(extra).length ? extra : true }),
  hidden: (name, value) => ({
    name,
    type: typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'string',
    hidden: true,
    ...(Array.isArray(value) && { list: true }),
  }),
  select: (name, label, values, description, extra = {}) => ({
    name,
    label,
    type: 'select',
    ...(description && { description }),
    options: { values, ...extra },
  }),
};

const iconSelect = (name = 'icon') =>
  f.select(name, 'Icon', icons.map((value) => ({ value, label: iconLabels[value] ?? value })), 'The small picture above the title.');

const linkField = (name, label) =>
  f.object(name, label, [
    f.string('label', 'Button or link text'),
    f.string('href', 'Goes to', 'A page on the site, like /donate/, or a full address starting with https://'),
  ]);

const photoGroup = (name, label, folder) =>
  f.object(name, label, [
    f.image('image', 'Photo', folder),
    f.string('alt', 'Photo description', 'Describe the photo for people who can’t see it, e.g. “Students in uniform stand beside the new water tank.”'),
    f.string('caption', 'Caption', 'Optional. Shown under the photo.'),
    f.hidden('position', '50% 50%'),
  ]);

const statFields = [
  f.number('value', 'Number'),
  f.string('prefix', 'Before the number', 'Optional, e.g. $'),
  f.string('suffix', 'After the number', 'Optional, e.g. % or +'),
  f.string('label', 'What it counts'),
];

/**
 * The form field for one key of a section or home page block, or null to leave
 * the key out of the form (it is then kept as it is when the file is saved).
 */
function fieldFor(key, value, ctx) {
  const folder = ctx.folder;
  switch (key) {
    case 'eyebrow':
      return f.string(key, 'Small label above the heading');
    case 'heading':
      return f.string(key, 'Heading', HEADING);
    case 'headline':
      return f.string(key, 'Headline', HEADING);
    case 'body':
      return f.list(f.text(key, 'Paragraphs', `One box per paragraph. ${MARKUP}`));
    case 'intro':
      return Array.isArray(value)
        ? f.list(f.text(key, 'Introduction', `One box per paragraph. ${MARKUP}`))
        : f.text(key, 'Introduction', MARKUP);
    case 'text':
      return Array.isArray(value)
        ? f.list(f.text(key, 'Paragraphs', `One box per paragraph. ${MARKUP}`))
        : f.text(key, 'Text', MARKUP);
    case 'list':
      return f.list(f.text(key, 'Ticked list', `One box per point. ${MARKUP}`));
    case 'after':
      return f.list(f.text(key, 'Paragraphs after the list', MARKUP));
    case 'outcomes':
      return f.list(f.text(key, 'Outcomes', `One box per point. ${MARKUP}`));
    case 'outcomesHeading':
      return f.string(key, 'Outcomes heading');
    case 'outcomesLead':
      return f.string(key, 'Outcomes first line', 'Optional bold line above the outcomes.');
    case 'quote':
      if (typeof value === 'string') return f.text(key, 'Quote');
      return f.object(key, 'Quote', [f.text('text', 'Quote'), f.string('attribution', 'Who said it')]);
    case 'attribution':
      return f.string(key, 'Who said it');
    case 'context':
      return f.string(key, 'Line under the name');
    case 'callout':
      return f.object(key, 'Highlighted statement', [f.text('text', 'Statement'), f.string('attribution', 'Who said it', 'Optional.')]);
    case 'callouts':
      return f.list(f.object(key, 'Highlighted statements', [f.text('text', 'Statement'), f.string('attribution', 'Who said it', 'Optional.')]));
    case 'image':
      if (typeof value === 'string') return f.image(key, 'Photo', folder);
      return photoGroup(key, 'Photo', folder);
    case 'imageAlt':
      return f.string(key, 'Photo description', 'Describe the photo for people who can’t see it.');
    case 'caption':
      return f.string(key, 'Photo caption', 'Optional. Shown on or under the photo.');
    case 'images':
      return f.list(photoGroup(key, 'Photos', folder), { max: 2 });
    case 'options':
      return f.object(key, 'Gift options', [
        f.string('heading', 'Heading'),
        f.text('text', 'Text', 'Optional.'),
        f.list(f.object('items', 'Amounts', [f.number('amount', 'Amount ($)'), f.string('label', 'What it pays for')])),
        f.string('button', 'Button text'),
      ]);
    case 'items':
      if (ctx.block === 'impactCounters')
        return f.list(f.object(key, 'Numbers', [...statFields, f.string('detail', 'Detail line'), f.string('project', 'Program')]));
      if (ctx.block === 'waysToHelp')
        return f.list(f.object(key, 'Ways to help', [f.string('title', 'Title'), f.text('text', 'Text'), iconSelect(), linkField('link', 'Link')]));
      return f.list(
        f.object(key, 'Boxes', [
          f.string('value', 'Big number', 'Optional, e.g. 250 or 85%.'),
          f.string('title', 'Title'),
          f.text('text', 'Text', 'Optional.'),
          iconSelect(),
        ]),
      );
    case 'areas':
      return f.list(f.object(key, 'Focus areas', [f.string('name', 'Name'), f.text('text', 'Text'), iconSelect()]));
    case 'name':
      return f.string(key, 'Name');
    case 'role':
      return f.string(key, 'Role');
    case 'story':
      return f.list(f.text(key, 'Story', `One box per paragraph. ${MARKUP}`));
    case 'people':
      return f.list(
        f.object(key, 'People', [
          f.string('name', 'Name'),
          f.string('role', 'Role'),
          f.list(f.text('bio', 'Bio', 'One box per paragraph.')),
          f.image('image', 'Photo', 'board', 'Optional. Without a photo, the person’s initials are shown.'),
          f.string('email', 'Email', 'Optional.'),
          f.hidden('position', '50% 30%'),
        ]),
      );
    case 'stat':
      return f.object(key, 'Big number', statFields);
    case 'link':
    case 'reports':
      return linkField(key, key === 'reports' ? 'Link under the partners' : 'Link');
    case 'primary':
      return linkField(key, 'Main button');
    case 'secondary':
      return linkField(key, 'Second button');
    case 'cta':
      return linkField(key, 'Button');
    case 'count':
      return f.number(key, 'How many stories to show', undefined, { options: { min: 1, max: 6 } });
    case 'partnersHeading':
      return f.string(key, 'Partners heading');
    case 'partners':
      return f.list(f.string(key, 'Partners', 'One box per partner.'));
    case 'note':
      return f.text(key, 'Note', 'Optional small print.');
    case 'button':
      return f.string(key, 'Button text');
    default:
      // type, id, variant, lede, imageSide, number, imagePosition, …: not shown.
      return null;
  }
}

/** Fields for one section or block: only the keys it actually has, in a sensible order. */
function fieldsForGroup(data, ctx) {
  return Object.entries(data)
    .map(([key, value]) => fieldFor(key, value, ctx))
    .filter(Boolean);
}

const sectionTypeLabel = {
  text: 'Text',
  cards: 'Boxes',
  person: 'Story',
  gifts: 'Gifts',
  program: 'Program',
  people: 'People',
};

function sectionsField(sections, folder) {
  const keys = Object.keys(sections);
  return f.object(
    'sections',
    'Page sections',
    keys.map((key, i) => {
      const s = sections[key];
      const title = plain(s.heading ?? s.name ?? sectionTypeLabel[s.type] ?? key);
      return f.object(key, `${i + 1}. ${clip(title)}`, fieldsForGroup(s, { folder, section: s.type }));
    }),
    'The sections of the page, in the order they appear. To add, remove or move a section, ask the website developer.',
  );
}

const blockLabel = {
  hero: 'Top of the page (big photo)',
  impactCounters: 'Impact numbers',
  focusAreas: 'Focus areas',
  featuredStory: 'Featured program',
  whereWeWork: 'Where we work (map)',
  projectGrid: 'Program cards',
  quoteBand: 'Quote',
  givingLevels: 'Your gift, put to work',
  storyList: 'News from the field',
  trustStrip: 'Accountability and partners',
  waysToHelp: 'Ways to help',
  callToAction: 'Closing message',
};

// ---------------------------------------------------------------------------
// Entries
// ---------------------------------------------------------------------------
const noDelete = { create: false, delete: false, rename: false };

function programEntry(p) {
  const d = p.data;
  const folder = programFolder(p);
  const fields = [
    f.string('title', 'Program name', 'The full name, shown at the top of the page and on the program card.'),
    f.string('shortTitle', 'Short name', 'Used on buttons, e.g. “Give to Rwanda Rising”.'),
  ];
  const add = (key, field) => key in d && fields.push(field);
  add('headline', f.string('headline', 'Big headline', HEADING));
  add('subtitle', f.text('subtitle', 'Line under the title'));
  add('summary', f.text('summary', 'Summary', 'Two or three sentences for the program card and search results.'));
  add('outcome', f.text('outcome', 'One-line result', 'Shown on the Donate page.'));
  add('place', f.string('place', 'Place', 'e.g. Gitega, Burundi'));
  add('partner', f.string('partner', 'Local partner'));
  add('zeffyUrl', f.string('zeffyUrl', 'Zeffy donation form address', 'Only change this if TIC creates a new Zeffy form for this program.'));
  add('image', f.image('image', 'Main photo', folder));
  add('imageAlt', f.string('imageAlt', 'Main photo description', 'Describe the photo for people who can’t see it.'));
  add('cardImage', f.image('cardImage', 'Program card photo', folder, 'Optional. A different photo for the program card.'));
  add('cardImageAlt', f.string('cardImageAlt', 'Program card photo description'));
  add('stats', f.list(f.object('stats', 'Numbers at the top', statFields)));
  // Only the headings this page actually sets (the others use their defaults).
  const headingLabels = { challenge: 'The challenge', approach: 'What we do', results: 'What changes', gallery: 'Photos', journey: 'Our journey' };
  add(
    'headings',
    f.object(
      'headings',
      'Section headings',
      Object.keys(d.headings ?? {})
        .filter((k) => k in headingLabels)
        .map((k) => f.string(k, headingLabels[k], HEADING)),
    ),
  );
  add('challenge', f.text('challenge', 'The challenge'));
  add('approach', f.list(f.object('approach', 'What we do (steps)', [f.string('title', 'Title'), f.text('text', 'Text')])));
  add('results', f.list(f.text('results', 'What changes', 'One box per point.')));
  add('quote', f.object('quote', 'Quote', [f.text('text', 'Quote'), f.string('attribution', 'Who said it')]));
  add(
    'person',
    f.object('person', 'Graduate story', [
      f.string('name', 'Name'),
      f.string('role', 'Role'),
      f.string('headline', 'Headline'),
      f.text('story', 'Story'),
      f.object('highlight', 'Big number beside the story', [f.string('value', 'Number'), f.string('label', 'What it counts')]),
    ]),
  );
  add('gallery', f.list(f.object('gallery', 'Photos', [f.image('image', 'Photo', folder), f.string('alt', 'Photo description'), f.string('caption', 'Caption')])));
  add('gifts', f.object('gifts', 'What your gift does', [f.string('heading', 'Heading', HEADING), f.text('text', 'Text'), f.text('note', 'Note under the gifts')]));
  add(
    'goal',
    f.object('goal', 'Fundraising goal', [f.number('amount', 'Goal ($)'), f.string('period', 'Period'), f.string('title', 'Title'), f.text('text', 'Text')]),
  );
  if (d.sections) fields.push(sectionsField(d.sections, folder));
  add('journeyImage', photoGroup('journeyImage', 'Photo in “Our journey”', folder));
  if (p.body.trim())
    fields.push({
      name: 'body',
      label: 'Our journey',
      description: 'The history at the bottom of the page.',
      type: 'rich-text',
      options: { format: 'markdown', media: false },
    });
  return {
    name: `program-${p.id}`,
    label: d.shortTitle,
    type: 'file',
    path: p.path,
    format: 'yaml-frontmatter',
    operations: noDelete,
    fields,
  };
}

const pageFiles = [
  ['who-we-are', 'Who we are'],
  ['who-we-are/our-story', 'The Transform Story'],
  ['who-we-are/board-of-directors', 'Board of Directors'],
  ['who-we-are/advisory-team-and-partners', 'Partners and Supporters'],
  ['what-we-do', 'What we do'],
  ['contact', 'Contact'],
];

function pageEntry([slug, label]) {
  const path = `src/content/pages/${slug}.md`;
  const { data } = readEntry(path);
  const folder = slug.includes('board') ? 'board' : undefined;
  const fields = [
    f.string('title', 'Page title', 'Shown in the browser tab and in search results.'),
    f.text('description', 'Search results summary', 'One or two sentences that Google shows under the page title.'),
  ];
  if ('eyebrow' in data) fields.push(f.string('eyebrow', 'Small label above the heading'));
  if ('heading' in data) fields.push(f.string('heading', 'Big heading', HEADING));
  if ('intro' in data) fields.push(f.list(f.text('intro', 'Introduction', `One box per paragraph. ${MARKUP}`)));
  if (data.sections) fields.push(sectionsField(data.sections, folder));
  return {
    name: `page-${slug.replace(/\//g, '-')}`,
    label,
    type: 'file',
    path,
    format: 'yaml-frontmatter',
    operations: noDelete,
    fields,
  };
}

function homeEntry() {
  const path = 'src/content/settings/home.json';
  const { data } = readEntry(path);
  const keys = Object.keys(data.blocks);
  return {
    name: 'home',
    label: 'Home page',
    type: 'file',
    path,
    format: 'json',
    operations: noDelete,
    fields: [
      f.string('title', 'Page title', 'Shown in the browser tab and in search results.'),
      f.text('description', 'Search results summary'),
      f.object(
        'blocks',
        'Home page sections',
        keys.map((key, i) => {
          const b = data.blocks[key];
          return f.object(key, `${i + 1}. ${blockLabel[b.type] ?? key}`, fieldsForGroup(b, { block: b.type }));
        }),
        'The sections of the home page, from top to bottom. To add, remove or move a section, ask the website developer.',
      ),
    ],
  };
}

const programSelect = (name, label, description, extra = {}) =>
  f.select(
    name,
    label,
    projects.map((p) => ({ value: p.id, label: p.data.shortTitle })),
    description,
    extra,
  );

function givingEntry() {
  return {
    name: 'giving',
    label: 'Gift levels and Donate page',
    type: 'file',
    path: 'src/content/settings/giving.json',
    format: 'json',
    operations: noDelete,
    fields: [
      f.list(
        f.object(
          'levels',
          'Suggested gifts',
          [
            f.boolean('published', 'Show this gift', 'Untick to hide it everywhere without deleting it.'),
            f.number('amount', 'Amount ($)', 'Leave empty only while the amount isn’t confirmed, and untick “Show this gift” until then.'),
            f.string('title', 'Title', 'e.g. One woman’s complete training'),
            f.text('text', 'What it does'),
            programSelect('project', 'Program'),
            f.select(
              'showOn',
              'Where it appears',
              [
                { value: 'home', label: 'Home page (“Your gift, put to work”)' },
                { value: 'donate', label: 'Donate page (on the program’s card)' },
                { value: 'program', label: 'The program’s own page' },
              ],
              'Choose none to hide it everywhere.',
              { multiple: true },
            ),
          ],
          'Each suggested amount, with what it pays for. Gifts for the same program are shown from smallest to largest.',
        ),
        { collapsible: { collapsed: true, summary: '${fields.amount} · {fields.title}' } },
      ),
      f.object('page', 'Donate page text', [
        f.string('heading', 'Big heading', HEADING),
        f.text('intro', 'Introduction'),
        f.string('programsHeading', 'Programs heading', HEADING),
        f.text('programsText', 'Programs text'),
        f.string('generalProgramsHeading', 'Heading over programs without their own form'),
        f.string('formHeading', 'General donation form heading'),
        f.text('formText', 'General donation form text'),
        f.text('formInstruction', 'Instruction above the form'),
        f.string('otherHeading', '“Other ways to give” heading'),
        f.text('volunteer', '“Volunteer or fundraise” text'),
        f.string('title', 'Page title', 'Shown in the browser tab and in search results.'),
        f.text('description', 'Search results summary'),
      ]),
      f.object('securities', 'Gifts of stock and securities', [
        f.string('heading', 'Heading', HEADING),
        f.list(f.text('text', 'Paragraphs', 'One box per paragraph.')),
        f.list(f.text('points', 'Ticked points', 'e.g. the year-end deadline. Check the date each year.')),
        f.string('heroLink', 'Link at the top of the Donate page'),
        f.text('cardText', 'Text in “Other ways to give”'),
      ]),
      f.text('taxReceipt', 'Tax receipt sentence'),
      f.text('zeffyNote', 'About Zeffy (long)'),
      f.text('zeffyShortNote', 'About Zeffy (short)', 'Shown under the gift cards on the home page.'),
      f.text('eTransfer', 'e-Transfer text'),
      f.text('legacy', 'Legacy gifts text'),
      f.string('generalZeffyUrl', 'General Zeffy form address', 'Only change this if TIC creates a new general Zeffy form.'),
      f.string('generalZeffyEmbedUrl', 'General Zeffy form address (embedded)', 'Usually the same as above.'),
    ],
  };
}

function siteEntry() {
  return {
    name: 'site',
    label: 'Site settings',
    type: 'file',
    path: 'src/content/settings/site.json',
    format: 'json',
    operations: noDelete,
    fields: [
      f.object('contact', 'Contact details', [
        f.string('general', 'General email'),
        f.string('donations', 'Donations email', 'Also where e-Transfers go.'),
        f.string('legacy', 'Legacy gifts email'),
        f.string('phone', 'Phone'),
        f.text('address', 'Mailing address'),
      ]),
      f.object('footer', 'Footer', [f.text('mission', 'Mission sentence'), f.text('taxReceipt', 'Tax receipt sentence')]),
      f.object('donate', 'Donate button (top of every page)', [f.string('label', 'Button text')]),
      f.list(
        f.object(
          'nav',
          'Menu',
          [
            f.string('label', 'Menu label'),
            f.string('href', 'Goes to', undefined, { readonly: true }),
            f.list(f.object('children', 'Links in this menu', [f.string('label', 'Link text'), f.string('href', 'Goes to', undefined, { readonly: true })])),
          ],
          'You can rename menu items here. Please don’t remove or reorder them; ask the website developer.',
        ),
        { collapsible: { collapsed: true, summary: '{fields.label}' } },
      ),
      f.list(f.object('social', 'Social media links', [f.string('label', 'Name, e.g. Facebook'), f.string('href', 'Address', 'Starts with https://')])),
    ],
  };
}

function storiesEntry() {
  return {
    name: 'stories',
    label: 'Stories',
    type: 'collection',
    path: 'src/content/stories',
    format: 'yaml-frontmatter',
    filename: { template: '{year}-{month}-{day}-{primary}.md', field: false },
    operations: { rename: false },
    view: { fields: ['title', 'date'], primary: 'title', default: { sort: 'date', order: 'desc' } },
    fields: [
      f.string('title', 'Title', 'Also becomes the story’s web address, so choose it before saving the first time.', { required: true }),
      { name: 'date', label: 'Date', type: 'date', required: true, options: { format: 'yyyy-MM-dd' } },
      f.string('dateLabel', 'Date shown instead', 'Optional. Use when only the month is known, e.g. “October 2026”.'),
      f.string('author', 'Author', 'Optional.'),
      programSelect('project', 'Program', 'Optional. Links the story to a program page.'),
      f.text('excerpt', 'Short summary', 'One or two sentences for the story cards and search results.', { required: true }),
      f.image('image', 'Main photo', 'stories', undefined),
      f.string('imageAlt', 'Photo description', 'Describe the photo for people who can’t see it, e.g. “Graduates celebrate at the ceremony in Gitega.”', { required: true }),
      f.string('imageCaption', 'Photo caption', 'Optional. Shown under the photo.'),
      {
        name: 'body',
        label: 'Story',
        type: 'rich-text',
        options: { format: 'markdown', media: false },
      },
      f.list(
        f.object('gallery', 'More photos', [
          f.image('image', 'Photo', 'stories'),
          f.string('alt', 'Photo description'),
          f.string('caption', 'Caption'),
          f.hidden('position', '50% 50%'),
        ]),
      ),
      f.hidden('imagePosition', '50% 50%'),
      f.hidden('url', ''),
    ],
  };
}
// The story's main photo is required.
// (Set here so the builder above stays short.)

function buildConfig() {
  const stories = storiesEntry();
  stories.fields.find((x) => x.name === 'image').required = true;
  return {
    settings: {
      content: { merge: true },
      // 'app': commits show as the Pages CMS app, so volunteers' names and email
      // addresses don't appear in the (public) git history.
      commit: { identity: 'app' },
    },
    media: [
      {
        name: 'photos',
        label: 'Photos',
        input: 'src/assets/photos',
        output: 'photos',
        categories: ['image'],
        extensions: ['jpg', 'jpeg', 'png', 'webp'],
        rename: 'safe',
      },
    ],
    content: [
      stories,
      { name: 'programs', label: 'Programs', type: 'group', items: projects.map(programEntry) },
      homeEntry(),
      { name: 'about', label: 'About pages', type: 'group', items: pageFiles.map(pageEntry) },
      givingEntry(),
      siteEntry(),
    ],
  };
}

// ---------------------------------------------------------------------------
// Simulating a Pages CMS save
// ---------------------------------------------------------------------------
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

/** What the form submits: only the keys that have fields. */
function project(value, fields) {
  const out = {};
  for (const field of fields) {
    if (!(field.name in value)) continue;
    const v = value[field.name];
    if (field.type === 'object' && field.list) out[field.name] = (v ?? []).map((item) => project(item, field.fields));
    else if (field.type === 'object') out[field.name] = isObj(v) ? project(v, field.fields) : v;
    else out[field.name] = v;
  }
  return out;
}

/** lodash.mergeWith with "arrays are replaced". */
function merge(target, source) {
  const out = { ...target };
  for (const [k, v] of Object.entries(source)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) out[k] = v;
    else if (isObj(v) && isObj(out[k])) out[k] = merge(out[k], v);
    else out[k] = v;
  }
  return out;
}

/** Pages CMS's sanitizeObject: drops "", null, empty lists and empty objects. */
function sanitize(o) {
  const empty = (v) => v === null || v === undefined || v === '';
  if (Array.isArray(o)) return o.map((v) => (isObj(v) || Array.isArray(v) ? sanitize(v) : v)).filter((v) => !empty(v));
  if (isObj(o)) {
    const out = {};
    for (const [k, v0] of Object.entries(o)) {
      const v = isObj(v0) || Array.isArray(v0) ? sanitize(v0) : v0;
      if (empty(v) || (Array.isArray(v) && v.every(empty)) || (isObj(v) && !Object.keys(v).length)) continue;
      out[k] = v;
    }
    return out;
  }
  return o;
}

/** Every key inside every list item must have a field, or saving deletes it. */
function listProblems(value, fields, where) {
  const problems = [];
  for (const field of fields) {
    const v = value?.[field.name];
    if (v === undefined) continue;
    if (field.type === 'object' && field.list) {
      const known = new Set(field.fields.map((x) => x.name));
      v.forEach((item, i) => {
        for (const k of Object.keys(item)) if (!known.has(k)) problems.push(`${where}.${field.name}[${i}].${k} has no field, so a save would delete it`);
        problems.push(...listProblems(item, field.fields, `${where}.${field.name}[${i}]`));
      });
    } else if (field.type === 'object' && isObj(v)) {
      problems.push(...listProblems(v, field.fields, `${where}.${field.name}`));
    }
  }
  return problems;
}

function* fileEntries(content) {
  for (const entry of content) {
    if (entry.type === 'group') yield* fileEntries(entry.items);
    else if (entry.type === 'file') yield entry;
    else if (entry.type === 'collection')
      for (const path of globSync(`${entry.path}/*.md`).sort()) yield { ...entry, path };
  }
}

function simulateSave(entry) {
  const { data, body } = readEntry(entry.path);
  const formFields = entry.fields.filter((x) => x.name !== 'body');
  const saved = sanitize(merge(data, project(data, formFields)));
  return { data, body, saved, problems: listProblems(data, formFields, entry.path) };
}

// ---------------------------------------------------------------------------
const config = buildConfig();

if (MODE === '--write') {
  const header =
    '# Pages CMS configuration (https://pagescms.org/docs/configuration/).\n' +
    '# GENERATED by scripts/pages-config.mjs — edit that script, not this file, then run\n' +
    '#   node scripts/pages-config.mjs && node scripts/pages-config.mjs --check\n\n';
  writeFileSync('.pages.yml', header + stringify(config, { lineWidth: 0 }));
  console.log('Wrote .pages.yml');
} else if (MODE === '--check' || MODE === '--simulate') {
  let problems = 0;
  for (const entry of fileEntries(config.content)) {
    const r = simulateSave(entry);
    for (const p of r.problems) {
      problems++;
      console.log('PROBLEM', p);
    }
    if (MODE === '--simulate') {
      if (entry.path.endsWith('.json')) writeFileSync(entry.path, JSON.stringify(r.saved, null, 2) + '\n');
      else writeFileSync(entry.path, `---\n${stringify(r.saved, { lineWidth: 80 })}---\n${r.body.replace(/^\n/, '')}`);
    }
  }
  console.log(problems ? `${problems} problem(s)` : `No data would be lost (${[...fileEntries(config.content)].length} files checked).`);
  process.exit(problems ? 1 : 0);
}
