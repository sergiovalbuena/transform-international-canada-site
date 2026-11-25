# Design system

The idea in one line: **the multi-coloured TRANSFORM logo becomes the system.**
Its nine letter colours, in order, form the "colour ribbon" that ties every
page together. Each program owns one colour, and the rest of the palette is
warm cream, sand and deep green, so the photos and the ribbon do the talking.

All tokens are defined once, in `src/styles/global.css` (`@theme static`).
Never hard-code a colour, size or duration in a component; use the token.

## Colour

### Base
| Token | Value | Use |
| --- | --- | --- |
| `--color-cream` | `#fbf7f0` | Page background (the default band) |
| `--color-sand` | `#f3eadb` | Tinted band |
| `--color-sand-deep` | `#eadcc4` | Map land, dividers on sand |
| `--color-paper` | `#fffdf9` | Cards |
| `--color-ink` | `#0f2418` | Text: a very dark green-black, never pure black |
| `--color-ink-muted` | `#55655a` | Secondary text (5.8:1 on cream) |
| `--color-line` | `#e2d6c2` | Hairlines and borders |

### Brand
| Token | Value | From the logo |
| --- | --- | --- |
| `--color-green-700` | `#186838` | Primary: links, buttons, emphasis (6.4:1 on cream) |
| `--color-green-800` | `#0f4a27` | Deep-green bands, big numbers |
| `--color-green-950` | `#082b17` | Footer, hero shading |
| `--color-gold-300` | `#f2c46b` | Highlights on dark green (6.4:1 on green-800) |
| `--color-gold-100` | `#fbe9c4` | Warm band (featured story, Donate hero) |
| `--color-gold-700` | `#9a6410` | Gold as text on light backgrounds (4.7:1) |

### Donate
`--color-donate` `#e0a030` with `--color-donate-ink` (`#0f2418`) text has a
contrast of **7.2:1**. The current site's Donate button is orange, so the warm
colour keeps that association. Every giving action on the site uses this
colour, and nothing else does, so the colour itself comes to mean "give".

### The ribbon (logo letters, in order)
T `#1e566d` · R `#642968` · A `#a81e24` · N `#a85828` · S `#d49529` ·
F `#0f4a27` · O `#186838` · R `#388848` · M `#5b9f6c` → `--ribbon`.

It appears in these places: the eyebrow labels, the line under the header
once you scroll, the bottom edge of every hero, the footer top, the map's
goal flag, the favicon. Keep it thin: a few pixels tall, never a background.

### Program accents
Each `--color-{key}` has a matching `--color-{key}-on` text colour that passes
WCAG AA when placed on it.

| Key | Program | Fill | Text on it |
| --- | --- | --- | --- |
| `burundi` | Street Business School | `#d49529` gold | ink |
| `rwanda` | Rwanda Rising | `#2f7a3f` green | white (5.3:1) |
| `malawi` | STREAMS | `#1e566d` teal | white |
| `india` | Open Hands India | `#642968` purple | white |
| `trades` | Youth Trades | `#a85828` orange | white (5.1:1) |
| `pads` | RDP Pads Program | `#5b9f6c` leaf | ink |

Accents are used for country tags, the strip on top of each card, counter
bars, map markers and the program page's hero edge. Don't use them for body
text.

### Section rhythm
The home page alternates bands so there is never a long stretch of one
colour: photo hero → cream → sand → photo + gold → cream → sand → deep green →
cream → sand → cream → green → ink footer. New pages should follow the same
idea: start with a photo or a warm band, alternate cream and sand, and use at
most two green bands per page.

## Typography

| Role | Font | Notes |
| --- | --- | --- |
| Display (headings, numbers, quotes) | **Fraunces Variable**, SOFT axis at 100, weight 560–600 | A warm, expressive serif. The soft axis rounds the terminals. Italic (500) is for one or two emphasized words per heading, set by wrapping them in `*asterisks*` in content. |
| Body and interface | **Plus Jakarta Sans Variable**, 400–700 | Friendly and clear at small sizes |

Why not Libre Caslon and Public Sans (the current site)? Caslon reads as
formal and bookish; Fraunces keeps a serif's credibility but feels warmer and
more confident at large sizes.

- Self-hosted through Fontsource, `font-display: swap`, Latin subset only. Both
  files are preloaded.
- **Metric-matched fallbacks** (`Fraunces Fallback`, `Plus Jakarta Fallback`):
  local Georgia and Arial, rescaled with `size-adjust` and ascent/descent
  overrides measured with fontkit, so text doesn't move when the web fonts
  arrive (CLS 0).
- Fluid scale, from `--text-step--1` (14–15px) to `--text-step-6` (48–96px).
  Body text is `--text-step-0`: 17px on mobile, 18px on desktop.
- Line length: `--container-prose` (40rem, about 68 characters).
- Headings use `text-wrap: balance`, paragraphs `text-wrap: pretty`.

## Space, shape, depth

- Spacing uses a 4px base. Sections use `--space-section` (72–144px, fluid);
  side padding is `--space-gutter` (16–40px).
- Content width: `--container-site`, 80rem (1280px).
- Radii: `--radius-sm` 6px (small labels), `--radius-md` 14px (panels),
  `--radius-lg` 28px (cards and photos), `--radius-pill` (buttons, tags).
- Shadows are warm-tinted, never grey: `--shadow-soft` at rest, `--shadow-lift`
  on hover or for floating elements.
- Photos get large radii, and occasionally an arch (the quote band) or a pill
  (coming-soon strip). Keep at most one unusual shape per section.

## Motion

Motion should make the site feel alive, never slow it down.

| Where | What | How |
| --- | --- | --- |
| Hero | Photo settles from 112% to 100% over 24s. Headline words rise in turn. | CSS only, on transform and opacity |
| Sections and cards | Fade and rise 28px once, staggered by 90ms | `data-reveal` / `data-reveal="2"` + `src/scripts/reveal.ts` |
| Impact numbers | Count up over 1.8s when scrolled into view | `Counter.astro` + `src/scripts/counters.ts` |
| Focus areas | Slow marquee (48s loop) | Pauses on hover and has a visible Pause button (WCAG 2.2.2) |
| Map | Markers pulse three times, then stop | CSS |
| Cards | Lift 4–6px; photo zooms to 105% | Hover only (`@media (hover: hover)`) |
| Links | Underline draws or retracts | `.link-underline`, `.link-arrow` |
| Donate button | A light sheen sweeps across | `::after` translate |
| Between pages | Cross-fade | Native `@view-transition`, no JavaScript |

Durations: `--duration-fast` 180ms, `--duration-base` 320ms,
`--duration-slow` 700ms. Easing: `--ease-out` (`cubic-bezier(.22,1,.36,1)`).

Rules:
1. **Everything respects `prefers-reduced-motion: reduce`.** With reduced
   motion, nothing moves: no reveals, no zoom, no marquee, no counting.
2. **Never cause layout shift.** Animate only `transform` and `opacity`.
   Counters reserve their final width with an invisible copy. The header stays
   the same height on scroll; only the logo scales.
3. **Content can never stay invisible.** Reveals only hide content once
   `src/scripts/reveal.ts` is running (it adds `.reveal-ready` to `<html>`).
   Elements already scrolled past are revealed at once, and if the
   IntersectionObserver hasn't reported within 1.5s, everything is revealed.
   `npm run check:reveal` verifies this in a real browser at 375px.
4. **Never animate the LCP image's visibility.** The hero photo is always
   opaque, preloaded with `fetchpriority="high"`.

## Accessibility rules

- WCAG 2.2 AA contrast for all text; check new colour pairs before use.
- Focus ring: 3px gold outline plus a 6px ink halo, visible on light and dark.
- One `h1` per page; headings in order; landmarks `header`, `nav`, `main`,
  `footer`; skip link first in the page.
- Zoom is never blocked (`width=device-width, initial-scale=1` only).
- Link text describes the destination ("Explore Rwanda Rising", never "Read
  more"). Whole-card links use one real link stretched over the card.
- Every image has alt text that describes what's happening; decorative images
  use `alt=""`.
- External links (Zeffy, old site, Facebook) announce where they go to screen
  readers.

## Components to reuse

`Button` (donate · primary · outline · outline-light), `Tag`, `ProjectCard`,
`StoryCard`, `GivingCards`, `Counter`, `Icon` (custom 24px line icons with a
1.75 stroke: add new ones to the same set), `ComingSoon`, and every home page
block in `src/components/blocks/`.
