# Transform International (Canada) — website

The new website for Transform International (Canada), a static site built with
[Astro](https://astro.build). It is fast (Lighthouse mobile 97–100), accessible
(WCAG 2.2 AA), and every word, number, photo and donation link lives in plain
data files so volunteers can update it without a developer.

- **Editing content?** Read [EDITING.md](EDITING.md).
- **Design rules** (colours, fonts, motion): [DESIGN.md](DESIGN.md).

## What's in this prototype

| Page | Address | Status |
| --- | --- | --- |
| Home | `/` | Complete |
| Donate | `/donate/` | Complete |
| Street Business School, Burundi | `/thars/` | Complete — the template for every program page |
| Six other programs | `/rwanda-risings-progress/`, `/streams/`, … | Preview pages with photo, key facts and the right donation link |
| Stories | `/stories/` | List of news posts (each opens on the current site for now) |
| About, What we do, Reports, Contact… | same addresses as today | "Coming to the new site" pages that link to the current site |

Every address from the current WordPress site is kept, so existing links,
bookmarks and search results keep working.

## Run it on your computer

You need [Node.js](https://nodejs.org) 22.23 or newer.

```bash
npm install        # once, to download the tools
npm run dev        # start a local copy at http://localhost:4321 that reloads as you edit
```

Other commands:

| Command | What it does |
| --- | --- |
| `npm run build` | Checks the content and code, then builds the final site into `dist/` |
| `npm run preview` | Serves the built site at http://localhost:4321 |
| `npm run shots` | Full-page screenshots at 375, 768, 1024 and 1440px into `screenshots/` (needs `preview` running) |
| `npm run audit` | Lighthouse (mobile) and axe accessibility checks (needs `preview` running) |
| `npm run import:wp` | Re-exports pages, posts and media details from the current WordPress site into `scripts/wp-export/` |
| `npm run import:images` | Downloads the chosen photos from WordPress into `src/assets/` |
| `npm run build:map` | Regenerates the "Where we work" map data from Natural Earth |
| `node scripts/build-icons.mjs` | Regenerates the favicons in `public/` |

The first time you run `shots` or `audit`, also run `npx playwright install chromium`.

## Deploy to Netlify (free)

Netlify hosts static sites like this one for free and rebuilds the site
automatically every time a change is saved to GitHub.

1. **Put the code on GitHub.** Create a free account at
   [github.com](https://github.com), create a new *private* repository (for
   example `transform-website`), and follow GitHub's instructions to push this
   folder to it.
2. **Create a Netlify account** at [netlify.com](https://www.netlify.com) and
   choose *Sign up with GitHub*.
3. In Netlify, click **Add new site → Import an existing project → GitHub**,
   and pick the repository.
4. Netlify reads the settings from `netlify.toml`, so you don't need to change
   anything: the build command is `npm run build` and the folder to publish is
   `dist`. Click **Deploy**.
5. After a minute or two you'll get an address like
   `https://transform-website.netlify.app`. Share it with the team to review.
6. **Use the real domain** when you're ready: in Netlify, go to
   **Domain management → Add a domain**, enter `transforminternational.ca`, and
   follow the instructions to point the domain's DNS at Netlify. Netlify adds
   the free HTTPS certificate automatically.
7. Set an environment variable `SITE_URL` (Netlify → **Site configuration →
   Environment variables**) to the final address, e.g.
   `https://transforminternational.ca`, so canonical links, the sitemap and
   social-share images use it.

From then on, any change committed to the `main` branch on GitHub goes live
automatically within a couple of minutes. If a change breaks the content rules
(for example a missing photo), the build stops and the live site stays as it
was. The reason appears on Netlify's **Deploys** page; turn on email
notifications under **Site configuration → Notifications** to receive it.

Cloudflare Pages works the same way (build command `npm run build`, output
`dist`) if you prefer it.

## How the code is organized

```
src/
  content/                ← all the words, numbers and links (see EDITING.md)
    projects/*.md         ← one file per program; the file name is the web address
    stories/*.md          ← one file per news post
    settings/site.json    ← menu, contact details, footer, "coming soon" pages
    settings/home.json    ← the home page, as an ordered list of sections ("blocks")
    settings/giving.json  ← suggested gifts, Donate page text, Zeffy links
  content.config.ts       ← the rules each content file must follow (checked at build)
  assets/photos/          ← original photos; Astro makes AVIF/WebP versions in every size
  components/blocks/      ← one component per home page section
  components/project/     ← pieces of the program page
  components/ui/          ← buttons, cards, icons, counters…
  components/layout/      ← header, footer, SEO tags
  pages/                  ← the routes: index, donate, [project], [...page], stories, 404
  styles/global.css       ← every design token (colours, type, spacing, motion)
scripts/                  ← WordPress import, photo download, map, icons, screenshots, audit
public/                   ← favicons, robots.txt, _redirects
```

### Ready for a visual CMS

The site is built from **blocks**: `home.json` is a list like
`[{ "type": "hero", … }, { "type": "impactCounters", … }]`, and
`src/components/blocks/BlockRenderer.astro` turns each one into its component.
This is the same "sections/blocks" model used by TinaCMS, Decap CMS and
Storyblok, so adding one later means describing these same files in the CMS's
configuration — not rewriting pages. The Zod schemas in `src/content.config.ts`
already list every field and its type, which maps directly to a CMS field list.

To add a new kind of home page section: create the component in
`src/components/blocks/`, add its schema to the `homeBlock` list in
`src/content.config.ts`, and register it in `BlockRenderer.astro`.

## Quality checks (last run)

Lighthouse, mobile, against the production build:

| Page | Performance | Accessibility | Best Practices | SEO | Weight |
| --- | --- | --- | --- | --- | --- |
| `/` | 97 | 100 | 100 | 100 | 392 KiB |
| `/donate/` | 99 | 100 | 100 | 100 | 164 KiB |
| `/thars/` | 99 | 100 | 100 | 100 | 199 KiB |

axe (WCAG 2.2 AA): no issues on any page at 375px or 1440px.

## Stack

Astro 7 (static output, TypeScript strict) · Tailwind CSS 4 (design tokens in
`@theme`) · `astro:assets` for images · Fontsource (Fraunces, Plus Jakarta
Sans) · `@astrojs/sitemap` · no client framework — a few small vanilla scripts
for the menu, counters and scroll reveals.
