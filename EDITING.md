# Editing the website — a guide for volunteers

You don't need to know how to code to update the site. Everything you might
want to change — a number, a sentence, a photo, a donation link — is in a
small text file in the `src/content/` folder. Change the file, save it, and the
site rebuilds itself in about two minutes.

> **Tip:** you will probably only do this a few times a year. Keep this page
> bookmarked; it is written so you can follow it from scratch every time.

## How to make a change

1. Go to the website's repository on **GitHub** and sign in.
2. Find the file you want (see the map below) and click it.
3. Click the **pencil icon** ("Edit this file").
4. Make your change. Keep the quotation marks, commas and colons exactly as
   they are around your text.
5. Scroll down, write a short note like "Update Rwanda scholarship number",
   and click **Commit changes**.
6. Wait about two minutes, then refresh the website.

**If something goes wrong:** the site will not break. If a file has a mistake
in it, the new version simply isn't published, and Netlify's **Deploys** page
shows which file and line to fix (turn on deploy notifications in Netlify to
get this by email). The old version stays online until then.

## Where everything lives

| I want to change… | Open this file |
| --- | --- |
| The big headline, photo or buttons at the top of the home page | `src/content/settings/home.json` → the block with `"type": "hero"` |
| The four big numbers on the home page | `home.json` → `"type": "impactCounters"` |
| The six focus areas (Clean water, Sanitation…) | `home.json` → `"type": "focusAreas"` |
| The featured story (72 new entrepreneurs…) | `home.json` → `"type": "featuredStory"` |
| The quote on the green band | `home.json` → `"type": "quoteBand"` |
| The partner names | `home.json` → `"type": "trustStrip"` |
| The order of the home page sections | `home.json` → move whole blocks up or down inside `"blocks"` (each block is a named entry, e.g. `"quote-band": { "type": "quoteBand", … }`) |
| Suggested gift amounts ($410, $360…) | `src/content/settings/giving.json` → `"levels"` |
| The text on the Donate page (headings, the Zeffy instruction above the general form) | `giving.json` → `"page"` |
| The general Zeffy donation link | `giving.json` → `"generalZeffyUrl"` (and `"generalZeffyEmbedUrl"`) |
| A program's title, summary, numbers, photo or Zeffy link | `src/content/projects/` → the program's file (see below) |
| A news story | `src/content/stories/` (see "Add a news story") |
| An About page, What we do or Contact | `src/content/pages/` (see "Content pages" below) |
| The board members, their photos and bios | `src/content/pages/who-we-are/board-of-directors.md` |
| An old web address that should send visitors to a new page | `vercel.json` → `"redirects"` (see "Redirect an old address") |
| The menu, contact emails, phone, address, Facebook link | `src/content/settings/site.json` |
| The charity registration number | `site.json` → `"charity"` |
| The footer text and tax-receipt sentence | `site.json` → `"footer"` |
| The "coming soon" pages (now only How you can help) | `site.json` → `"comingSoon"` |

### Program files

Each program has one file in `src/content/projects/`. **The file name is the
web address:** `thars.md` is the page at `/thars/`.

| File | Program |
| --- | --- |
| `thars.md` | Street Business School, Burundi |
| `rwanda-risings-progress.md` | Rwanda Rising |
| `streams.md` | STREAMS, Malawi |
| `india-ohet.md` | Open Hands Education Trust, India |
| `youth-trades.md` | Youth Trades, Rwanda |
| `rdp-pads-program.md` | RDP Pads Program, Malawi |

The top of each file, between the two `---` lines, holds the facts:

```yaml
title: Street Business School, Burundi
summary: Six months of practical business training…
zeffyUrl: https://www.zeffy.com/en-CA/donation-form/burundi-street-business-school-program-with-thars
status: full            # "full" = complete page, "coming-soon" = short preview page
stats:
  - value: 72
    label: new entrepreneurs graduated in January 2026
```

Below the second `---` is the long history, shown in the folding
"Our journey together" section. Write it as normal paragraphs; wrap words in
`**double asterisks**` to make them bold.

To turn a preview page into a complete page, either fill in `challenge`,
`approach`, `results`, `gallery` and `goal` (copy the layout from `thars.md`),
or build the page from `sections` (below), then change `status: coming-soon`
to `status: full`.

The section title "Our journey together" can be changed with
`headings: journey: …`, and `journeyImage` adds a photo inside it.

### Program pages built from sections

Every finished program page (Rwanda Rising, Open Hands, STREAMS, Community
Health Clubs + SBS, Youth Trades, Youth Menstrual Hygiene) lists its page as
`sections`, in order. The content pages in `src/content/pages/` use the same
sections. Each section is a named entry (a short name of your choice, such
as `street-kids:`) followed by its `type:`, and has a `heading` (and an
optional small `eyebrow` label above it). Sections appear in the order they
are written: move, copy or delete whole entries to change the page. Names
must be unique within the page and must not be plain numbers. They are named
entries rather than a list so that volunteers using the content editor can
edit the text but can't add, remove or reorder sections (see
EDITING-GUIDE.md). If you add a section, also add its fields to
`.pages.yml` so it shows up in the editor. In body text,
`**double asterisks**` make words bold.

| `type` | What it shows | Example |
| --- | --- | --- |
| `text` | Paragraphs (`body`), a ticked `list`, more paragraphs (`after`), a `quote`, highlighted `callouts` (the "SIDEBAR" notes in the client's documents), a photo (`image`) and gift options (`options`). Without a photo, the list, quote, callouts or options sit in a second column. `variant: statement` shows a short line large on a green band. | STREAMS: "Two types of roving experts" |
| `cards` | Boxes (`items`, each with a `title` and an optional `icon`) beside up to two photos (`images`) | Rwanda: "What we do" |
| `person` | One person's `story`, with a round portrait | Rwanda: Emmanuel |
| `gifts` | The program's suggested gifts from `giving.json` (levels with `"program"` in `showOn`), or a donate button if it has none | Rwanda: "Put up a ladder" |
| `program` | A numbered program: `body`, `outcomes` (with an optional bold `outcomesLead`), a coloured `callout` and up to two photos | India: the five OHET programs |
| `people` | People with a round photo (or their initials when there's no `image`), `role` and `bio` paragraphs. The `heading` is optional. | Board of Directors |

```yaml
  street-kids:                   # the entry's name (only a label for developers)
    type: text
    id: street-kids              # optional: makes /rwanda-risings-progress/#street-kids
    eyebrow: Reintegrating vulnerable groups
    heading: The Street Kids *Project*
    body:
      - A local headmaster built up trust among 50 truant kids…
    options:                     # amounts with one button to the program's Zeffy form
      heading: Fund a day camp to keep them together and joyful
      items:
        - amount: 250
          label: Christmas holiday camp
      button: Fund a camp
```

```yaml
  malawi:
    type: text
    heading: STREAMS in *Malawi*
    body:
      - Rumphi District, located in northern Malawi, hosts 20 health care centres…
    callouts:                    # one or more highlighted statements
      - text: Providing these essential WASH services protects public health…
```

**Links in text:** write `[the words](/thars/)` to link to a page on the site,
`[the words](#outcomes)` to a part of the same page, or
`[an email](mailto:someone@example.org)`. Links to other websites must start
with `https://`.

**Subtitle:** a program file can have `subtitle:`, a short line shown under
the title at the top of its page instead of the `summary` (the summary is
still used on the program cards).

Icons for `cards`: `food`, `book`, `school`, `skills`, `home`, `water`,
`sanitation`, `hygiene`, `heart`, `gift`, `hands`, `megaphone`, `energy`.

### Content pages (About, What we do, Contact)

Each file in `src/content/pages/` is one page, and its place in the folder is
its web address: `pages/what-we-do.md` is `/what-we-do/`, and
`pages/who-we-are/board-of-directors.md` is `/who-we-are/board-of-directors/`.
At the top of each file: `title` (browser tab and search results),
`description` (search results), an optional small `eyebrow`, the big
`heading` and optional `intro` paragraphs. Then come the `sections`, as on
program pages. `aboutLinks: true` adds the "More about us" links to the other
About pages at the bottom (taken from the About menu in `site.json`).

### Add a program
1. Copy a finished program file in `src/content/projects/` and rename it; the
   file name becomes the web address (`malawi-chc-sbs.md` → `/malawi-chc-sbs/`).
2. Set `order` (its place in the program grid), `country` and `accent` (its
   colour). The home page grid and the map pick it up automatically.
3. Add it to the "Our work" menu in `site.json`; the footer copies the menu.
4. Update the count in the home page "Where we work" heading in `home.json`.

## Common tasks

### Change a number
Find it in the table above, change the digits, keep everything else.
Numbers are written without commas or dollar signs: `1000`, not `$1,000`.

### Emphasize words in a heading
Wrap them in single asterisks: `"Your gift, *put to work*"` shows "put to
work" in the green italic style.

### Add a news story
1. In `src/content/stories/`, open an existing story and copy everything in it.
2. Click **Add file → Create new file**. Name it with the date first, e.g.
   `2026-11-15-new-well-in-dadawan.md`. The story's page will be
   `/stories/new-well-in-dadawan/` (the name without the date).
3. Paste, then change the title, date (`2026-11-15`), excerpt and photo.
   Write the story itself below the second `---` line: blank lines between
   paragraphs, `## ` before a subheading, `- ` before list items and `> `
   before a quote.
4. Optional fields: `author`, `dateLabel` (shown instead of the full date
   when only the month or year is known, e.g. `October 2026`), `imageCaption`,
   `project` (the program's file name, which adds "Explore" and "Support"
   buttons) and `gallery` (more photos after the story).
5. The three newest stories appear on the home page automatically.

### Redirect an old address
When a page moves or is removed, add a line to `"redirects"` in `vercel.json`:

```json
{ "source": "/old-address/", "destination": "/new-address/", "statusCode": 301 },
```

Vercel then sends visitors (and search engines) to the new page. The same
list also makes a small "this page has moved" file for local previews, so
there's nothing else to do. (`public/_redirects` is a copy for Netlify, which
the live site doesn't use.)

### Change or add a photo
1. Upload the photo to the right folder in `src/assets/photos/` (for example
   `src/assets/photos/rwanda/`). Use the largest original you have; the site
   resizes it. JPEG is best. Avoid screenshots and WhatsApp-compressed images
   when you can.
2. In the content file, set the photo path, starting from `photos/`:
   `image: photos/rwanda/new-classroom.jpg`.
3. Always update the description next to it (`imageAlt`). Describe **what is
   happening**, as if to someone on the phone: "Students plant vegetables in the
   new school garden." Don't start with "Photo of".
4. If the important part of the photo gets cut off, adjust `imagePosition`:
   `50% 50%` is the centre, `50% 20%` keeps the top, `30% 50%` keeps the left.

**Photo consent:** for large photos, prefer groups and activities over
close-ups of children who can be identified, until a consent process is in place.

### Change a donation link
Copy the link from Zeffy (it starts with `https://www.zeffy.com/`) and paste it
over the old one in the program's file (`zeffyUrl`) or in `giving.json`.
Programs without their own Zeffy form use the general form's link.

### Show, hide or confirm a suggested gift
Each level in `giving.json` has `"published": true` (shown) or `false`
(hidden everywhere, but kept so you can switch it back on).

`"showOn"` decides where a published level appears:

- `"home"`: the "Your gift, put to work" cards on the home page
- `"donate"`: the examples on that program's card under "Choose where your gift
  goes" on the Donate page (two or three per program read best)
- `"program"`: "What your gift does" on the program's own page

For example, `"showOn": ["donate", "program"]` keeps a large gift off the home
page, and `"showOn": []` (or leaving `showOn` out) keeps a level in the file
without showing it anywhere (the $50 and $205 Street Business School levels are
kept this way for a future campaign). A missing `showOn` means "nowhere"
because the content editor removes empty lists when it saves. The order of the levels in the file is the order on the home page.

A level can only be published once it has an amount. The *Learn a trade*
level (India) is hidden until its amount is confirmed: set `"amount": 150`
(for example), then change `"published"` to `true`. If a level is published
without an amount, the site won't build and the message says why.

With one or two home-page levels, the home page places them beside the text;
with three or more, they go in a full-width row.

The "What your gift does" section on a program page takes its heading and
intro from `gifts` in the program's file. An optional `note` adds a line under
the cards; leave it out to hide it.

## Things to leave alone

- Anything in `src/components/`, `src/pages/`, `src/styles/` — that's the design.
- The words `type`, `id` and the field names before each colon — only change the
  text after the colon.
- `scripts/wp-export/` — a snapshot of the old site, kept for the migration.

If you're unsure, make the change anyway: the site checks every file before
publishing and will tell you exactly what to fix.
