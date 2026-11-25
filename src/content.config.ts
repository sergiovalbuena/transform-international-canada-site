/**
 * Content schemas. Every piece of text, number, photo and donation link on the
 * site lives in src/content/ and is checked against these rules when the site
 * builds — a typo in a data file stops the build with a clear message instead
 * of publishing a broken page.
 *
 * The shapes below are deliberately simple and flat so a visual CMS
 * (TinaCMS, Decap or Storyblok) can be pointed at the same files later.
 */
import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** Colour keys from the logo, one per program (see src/styles/global.css). */
export const accents = ['burundi', 'rwanda', 'malawi', 'india', 'trades', 'pads'] as const;
export const countries = ['burundi', 'rwanda', 'malawi', 'india'] as const;
/** Places a suggested gift can appear (see giving.json → levels → showOn). */
export const givingPlaces = ['home', 'donate', 'program'] as const;
export const icons = ['water', 'sanitation', 'hygiene', 'food', 'energy', 'skills', 'heart', 'gift', 'hands', 'megaphone', 'school', 'home', 'book'] as const;

/**
 * A photo path relative to src/assets/, e.g. "photos/burundi/graduation-2026.jpg".
 * src/lib/images.ts turns it into an optimized image and fails the build if
 * the file does not exist.
 */
const photo = z.string().regex(/^photos\/.+\.(jpe?g|png|webp)$/i, 'Use a path like photos/folder/name.jpg');

const link = z.object({ label: z.string(), href: z.string() });

/**
 * Page sections and home page blocks are stored as named entries rather than
 * a list, e.g.
 *
 *   sections:
 *     education:
 *       type: text
 *       heading: ...
 *
 * The content editor (Pages CMS, see .pages.yml) can then show each one as a
 * fixed group of fields: volunteers can edit the text but can't add, remove or
 * reorder sections. They appear on the page in the order they are written in
 * the file. The names are only labels for developers; a section's web anchor
 * is still its `id`. Avoid names that are plain numbers ("1"), which
 * JavaScript would move to the front.
 */
const keyed = <T extends z.ZodTypeAny>(item: T) =>
  z.record(z.string(), item).transform((entries) => Object.values(entries) as z.output<T>[]);
const stat = z.object({
  value: z.number(),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
  label: z.string(),
});

// ---------------------------------------------------------------------------
// Program-page sections. A program file can list `sections` to build its page
// from these blocks, in order, instead of the fixed challenge → approach →
// results layout. Wrap words in *asterisks* to emphasize them in headings, and
// in **double asterisks** to make them bold in body text.
// ---------------------------------------------------------------------------
const sectionImage = z.object({
  image: photo,
  alt: z.string(),
  /** Which part of the photo to keep when it is cropped, e.g. "50% 20%" keeps the top. */
  position: z.string().default('50% 50%'),
  caption: z.string().optional(),
});
const quote = z.object({ text: z.string(), attribution: z.string() });
/** A short highlighted statement beside the text (the client's "SIDEBAR" notes). */
const callout = z.object({ text: z.string(), attribution: z.string().optional() });
const sectionBase = {
  /** Optional anchor, e.g. "street-kids" makes /rwanda-risings-progress/#street-kids. */
  id: z.string().optional(),
  /** The small label above the heading. */
  eyebrow: z.string().optional(),
  heading: z.string(),
};
/** A short list of suggested amounts with one button to the program's Zeffy form. */
const giftOptions = z.object({
  heading: z.string(),
  text: z.string().optional(),
  items: z.array(z.object({ amount: z.number(), label: z.string() })),
  button: z.string().default('Give now'),
});

export const projectSection = z.discriminatedUnion('type', [
  /** Paragraphs, an optional list, quote, photo and gift options. */
  z.object({
    type: z.literal('text'),
    ...sectionBase,
    /** "statement" shows the heading and text large and centred on a green band. */
    variant: z.enum(['default', 'statement']).default('default'),
    body: z.array(z.string()).default([]),
    /** No longer used: every paragraph is shown at body size. Kept so existing files still build. */
    lede: z.boolean().default(true),
    list: z.array(z.string()).default([]),
    /** Paragraphs shown after the list. */
    after: z.array(z.string()).default([]),
    quote: quote.optional(),
    /** Highlighted statements shown beside (or under) the text. */
    callouts: z.array(callout).default([]),
    image: sectionImage.optional(),
    imageSide: z.enum(['left', 'right']).default('right'),
    options: giftOptions.optional(),
  }),
  /** A grid of boxes, each with an optional big number, beside up to two photos. */
  z.object({
    type: z.literal('cards'),
    ...sectionBase,
    intro: z.string().optional(),
    items: z.array(
      z.object({ value: z.string().optional(), icon: z.enum(icons).optional(), title: z.string(), text: z.string().optional() }),
    ),
    images: z.array(sectionImage).max(2).default([]),
  }),
  /** One person's story, with a portrait. */
  z.object({
    type: z.literal('person'),
    ...sectionBase,
    name: z.string(),
    role: z.string().optional(),
    story: z.array(z.string()),
    image: sectionImage.optional(),
  }),
  /** This program's suggested gifts from giving.json ("program" in showOn), or a donate button if it has none. */
  z.object({
    type: z.literal('gifts'),
    ...sectionBase,
    text: z.string().optional(),
    image: sectionImage.optional(),
  }),
  /** One numbered program within a partner's work: description, outcomes, a callout and photos. */
  z.object({
    type: z.literal('program'),
    ...sectionBase,
    number: z.number().optional(),
    body: z.array(z.string()),
    outcomesHeading: z.string().default('2025–26 outcomes'),
    /** A bold first line for the outcomes, e.g. "Graduates in Goh are already employed". */
    outcomesLead: z.string().optional(),
    outcomes: z.array(z.string()).default([]),
    callout: callout.optional(),
    images: z.array(sectionImage).max(2).default([]),
  }),
  /** A list of people with a photo (or their initials), role and short bio, e.g. the board. */
  z.object({
    type: z.literal('people'),
    id: z.string().optional(),
    eyebrow: z.string().optional(),
    /** Optional: leave out when the page title already says it. */
    heading: z.string().optional(),
    people: z.array(
      z.object({
        name: z.string(),
        role: z.string().optional(),
        bio: z.array(z.string()).default([]),
        /** Leave out to show the person's initials instead. */
        image: photo.optional(),
        position: z.string().default('50% 30%'),
        email: z.email().optional(),
      }),
    ),
  }),
]);
export type ProjectSection = z.infer<typeof projectSection>;

// ---------------------------------------------------------------------------
// Projects (one Markdown file per program). The file name is the web address:
// projects/thars.md is published at /thars/. The Markdown body is the long
// history, shown in a collapsible "Our journey" section.
// ---------------------------------------------------------------------------
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
      title: z.string(),
      shortTitle: z.string(),
      /** Optional big headline for the top of the page; the program title then shows above it. */
      headline: z.string().optional(),
      /** Optional line under the title at the top of the page; shown instead of the summary there. */
      subtitle: z.string().optional(),
      order: z.number(),
      country: z.enum(countries),
      place: z.string(),
      partner: z.string(),
      accent: z.enum(accents),
      summary: z.string(),
      outcome: z.string(),
      /** "full" pages are built in the new site; others show a "coming soon" page. */
      status: z.enum(['full', 'coming-soon']),
      /** The page on the old WordPress site, if there was one (used only by unfinished pages). */
      oldUrl: z.url().optional(),
      zeffyUrl: z.url(),
      image: photo,
      imageAlt: z.string(),
      imagePosition: z.string().default('50% 50%'),
      /** Optional different photo for the program card, when the main photo is used nearby. */
      cardImage: photo.optional(),
      cardImageAlt: z.string().optional(),
      stats: z.array(stat).default([]),
      /** Headings for each section of a full program page. Wrap words in *asterisks* to emphasize them. */
      headings: z
        .object({
          challenge: z.string().default('The challenge'),
          approach: z.string().default('What we do'),
          results: z.string().default('What changes'),
          gallery: z.string().default('In pictures'),
          journey: z.string().default('Our journey together'),
        })
        .prefault({}),
      challenge: z.string().optional(),
      approach: z.array(z.object({ title: z.string(), text: z.string() })).default([]),
      results: z.array(z.string()).default([]),
      quote: z.object({ text: z.string(), attribution: z.string() }).optional(),
      person: z
        .object({
          name: z.string(),
          role: z.string(),
          headline: z.string(),
          story: z.string(),
          /** A big number shown beside the story, e.g. { value: 10, label: "jobs created" }. */
          highlight: z.object({ value: z.string(), label: z.string() }).optional(),
        })
        .optional(),
      gallery: z.array(z.object({ image: photo, alt: z.string(), caption: z.string().optional() })).default([]),
      /**
       * The "What your gift does" section, shown when giving.json has levels for
       * this program with "program" in their showOn list. The note is optional.
       */
      gifts: z
        .object({
          heading: z.string().default('What your gift *does*'),
          /** A sentence or two under the heading. */
          text: z.string().optional(),
          /** A short line under the cards, e.g. a larger figure. Leave out to hide it. */
          note: z.string().optional(),
        })
        .prefault({}),
      goal: z
        .object({
          amount: z.number(),
          period: z.string(),
          title: z.string(),
          text: z.string(),
        })
        .optional(),
      /**
       * Build the page from these blocks instead of the fixed layout above
       * (challenge, approach, results, person, gallery and gifts are then ignored).
       */
      sections: keyed(projectSection).optional(),
      /** A photo shown inside the "Our journey" section, above the story. */
      journeyImage: sectionImage.optional(),
    }),
});

// ---------------------------------------------------------------------------
// Stories (one Markdown file per news post).
// ---------------------------------------------------------------------------
const stories = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/stories' }),
  schema: z.object({
      title: z.string(),
      date: z.coerce.date(),
      excerpt: z.string(),
      image: photo,
      imageAlt: z.string(),
      imagePosition: z.string().default('50% 50%'),
      project: reference('projects').optional(),
      /** Shown instead of the full date when only the month or year is known, e.g. "October 2026". */
      dateLabel: z.string().optional(),
      author: z.string().optional(),
      /** Caption under the photo at the top of the story page. */
      imageCaption: z.string().optional(),
      /** More photos, shown after the story. */
      gallery: z.array(z.object({ image: photo, alt: z.string(), caption: z.string().optional(), position: z.string().default('50% 50%') })).default([]),
      /** Leave out: the story gets its own page at /stories/<file name without the date>/. Only set it to link somewhere else. */
      url: z.string().optional(),
    }),
});

// ---------------------------------------------------------------------------
// Pages (About pages, What we do, Contact). The file path is the web address:
// pages/who-we-are/board-of-directors.md is published at
// /who-we-are/board-of-directors/. Built from the same sections as programs.
// ---------------------------------------------------------------------------
const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    eyebrow: z.string().optional(),
    /** The big heading at the top; defaults to the title. Wrap words in *asterisks* to emphasize them. */
    heading: z.string().optional(),
    intro: z.array(z.string()).default([]),
    sections: keyed(projectSection).default([]),
    /** Show the "More about us" links to the other About pages at the bottom. */
    aboutLinks: z.boolean().default(false),
  }),
});

// ---------------------------------------------------------------------------
// Site settings: navigation, contact details, footer.
// ---------------------------------------------------------------------------
const navItem = z.object({
  label: z.string(),
  href: z.string(),
  children: z.array(link).default([]),
});

const site = defineCollection({
  loader: glob({ pattern: 'site.json', base: './src/content/settings' }),
  schema: z.object({
    name: z.string(),
    legalName: z.string(),
    tagline: z.string(),
    description: z.string(),
    nav: z.array(navItem),
    donate: link,
    contact: z.object({
      general: z.email(),
      donations: z.email(),
      legacy: z.email(),
      phone: z.string(),
      address: z.string(),
    }),
    social: z.array(z.object({ label: z.string(), href: z.url() })),
    charity: z.object({ registrationNumber: z.string(), since: z.string() }),
    footer: z.object({ mission: z.string(), taxReceipt: z.string() }),
    /** Pages not yet rebuilt: each gets a friendly "coming soon" page. */
    comingSoon: z.array(
      z.object({ slug: z.string(), title: z.string(), oldUrl: z.url().optional(), description: z.string() }),
    ),
  }),
});

// ---------------------------------------------------------------------------
// Giving: suggested amounts and Zeffy donation forms.
// ---------------------------------------------------------------------------
const giving = defineCollection({
  loader: glob({ pattern: 'giving.json', base: './src/content/settings' }),
  schema: z.object({
    /** Text for the Donate page. */
    page: z.object({
      title: z.string(),
      description: z.string(),
      heading: z.string(),
      intro: z.string(),
      formHeading: z.string(),
      formText: z.string(),
      /** "Choose where your gift goes": the program cards at the top of the page. */
      programsHeading: z.string(),
      programsText: z.string(),
      /** Heading over the programs that don't have their own Zeffy form. */
      generalProgramsHeading: z.string(),
      /** One line above the general form telling donors how to pick a program on Zeffy. */
      formInstruction: z.string(),
      otherHeading: z.string(),
      volunteer: z.string(),
    }),
    generalZeffyUrl: z.url(),
    generalZeffyEmbedUrl: z.url(),
    levels: z.array(
      z
        .object({
          /** Set to false to hide this level everywhere without deleting it. */
          published: z.boolean().default(true),
          /** Leave empty (null) until the amount is confirmed, and keep the level unpublished until then. */
          amount: z.number().nullable().default(null),
          title: z.string(),
          text: z.string(),
          project: reference('projects'),
          /**
           * Where the level appears: "home" (Your gift, put to work), "donate"
           * (the examples on that program's card on the Donate page) and
           * "program" (the program's own page). An empty or missing list hides
           * it everywhere. (Pages CMS removes empty lists when it saves, so a
           * missing list must mean the same as an empty one.)
           */
          showOn: z.array(z.enum(givingPlaces)).default([]),
        })
        .refine((level) => !level.published || level.amount !== null, {
          message: 'A published gift level needs an amount. Add the amount or set "published" to false.',
        }),
    ),
    taxReceipt: z.string(),
    zeffyNote: z.string(),
    /** One sentence, shown under the gift cards on the home page. */
    zeffyShortNote: z.string(),
    eTransfer: z.string(),
    legacy: z.string(),
    /** "Gifts of stock and securities" on the Donate page (CanadaHelps form). */
    securities: z.object({
      heading: z.string(),
      /** Paragraphs beside the form. */
      text: z.array(z.string()),
      /** Short points under the text, e.g. the year-end deadline. */
      points: z.array(z.string()),
      /** One line in the Donate page header that links down to this section. */
      heroLink: z.string(),
      /** The card in "Other ways to give". */
      cardText: z.string(),
      /** From CanadaHelps' embed code: data-page-id and data-formtype (4 = securities). */
      canadaHelpsPageId: z.string(),
      canadaHelpsFormType: z.string(),
    }),
  }),
});

// ---------------------------------------------------------------------------
// Home page: an ordered list of blocks. Reorder, remove or duplicate blocks
// here to change the page. Each "type" matches a component in
// src/components/blocks/.
// ---------------------------------------------------------------------------
const homeBlock = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('hero'),
    eyebrow: z.string(),
    headline: z.string(),
    text: z.string(),
    image: photo,
    imageAlt: z.string(),
    imagePosition: z.string().default('50% 50%'),
    caption: z.string().optional(),
    primary: link,
    secondary: link,
  }),
  z.object({
    type: z.literal('impactCounters'),
    id: z.string().optional(),
    eyebrow: z.string(),
    heading: z.string(),
    items: z.array(stat.extend({ detail: z.string(), project: z.string() })),
    note: z.string().optional(),
  }),
  z.object({
    type: z.literal('focusAreas'),
    eyebrow: z.string(),
    heading: z.string(),
    text: z.string(),
    areas: z.array(z.object({ name: z.string(), icon: z.enum(icons), text: z.string() })),
    image: photo,
    imageAlt: z.string(),
    link: link.optional(),
  }),
  z.object({
    type: z.literal('featuredStory'),
    eyebrow: z.string(),
    heading: z.string(),
    text: z.string(),
    image: photo,
    imageAlt: z.string(),
    imagePosition: z.string().default('50% 50%'),
    stat: stat.optional(),
    outcomesHeading: z.string(),
    outcomes: z.array(z.string()),
    link: link,
  }),
  z.object({
    type: z.literal('whereWeWork'),
    eyebrow: z.string(),
    heading: z.string(),
    text: z.string(),
  }),
  z.object({
    type: z.literal('projectGrid'),
    eyebrow: z.string(),
    heading: z.string(),
    text: z.string(),
  }),
  z.object({
    type: z.literal('quoteBand'),
    quote: z.string(),
    attribution: z.string(),
    context: z.string(),
    image: photo.optional(),
    imageAlt: z.string().optional(),
    link: link.optional(),
  }),
  z.object({
    type: z.literal('givingLevels'),
    eyebrow: z.string(),
    heading: z.string(),
    text: z.string(),
    cta: link,
  }),
  z.object({
    type: z.literal('storyList'),
    eyebrow: z.string(),
    heading: z.string(),
    count: z.number().default(3),
    link: link.optional(),
  }),
  z.object({
    type: z.literal('trustStrip'),
    heading: z.string(),
    partnersHeading: z.string(),
    partners: z.array(z.string()),
    /** Optional link under the partners, e.g. to the annual report. */
    reports: link.optional(),
  }),
  z.object({
    type: z.literal('waysToHelp'),
    eyebrow: z.string(),
    heading: z.string(),
    text: z.string(),
    items: z.array(z.object({ title: z.string(), text: z.string(), icon: z.enum(icons), link })),
  }),
  z.object({
    type: z.literal('callToAction'),
    heading: z.string(),
    text: z.string(),
    primary: link,
    secondary: link.optional(),
  }),
]);

const home = defineCollection({
  loader: glob({ pattern: 'home.json', base: './src/content/settings' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    blocks: keyed(homeBlock),
  }),
});

export type HomeBlock = z.infer<typeof homeBlock>;
export type BlockOf<T extends HomeBlock['type']> = Extract<HomeBlock, { type: T }>;

export const collections = { projects, stories, pages, site, giving, home };
