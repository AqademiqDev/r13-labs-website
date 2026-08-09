# R13 Labs — website

The R13 Labs marketing site, built from the Claude Design handoff in `design/`.

Six pages ship: Home, Science, Company, Contact, Prism Venues, Prism Automotive.

Two more exist in `src/pages/` but are **held back from the build** — see
[Drafts](#drafts).

## Running it

```bash
npm run dev
```

Builds `dist/` and serves it at http://localhost:4173. `npm run build` builds
only. There are no dependencies — the build and the dev server are two small
Node scripts.

`dist/` is plain static HTML and can also be opened straight from the
filesystem; every path in it is relative.

## Deploying

### Vercel

Import the repo and deploy — [vercel.json](vercel.json) already sets everything:

| Setting | Value |
| --- | --- |
| Framework preset | Other (none) |
| Build command | `node build.js` |
| Output directory | `dist` |
| Install command | *(nothing to install)* |

It also sets a one-year immutable cache on the fonts, a week on the images, and
`nosniff` / `strict-origin-when-cross-origin` on everything.

`dist/` is gitignored on purpose — Vercel rebuilds it from `src/` on every push,
so the deployed site can never drift from the source.

URLs keep their `.html` extension (`/science.html`). That's deliberate: the same
build works on any host and straight off the filesystem. If you'd rather have
`/science`, add `"cleanUrls": true` to `vercel.json` — Vercel will then redirect
the `.html` paths to the clean ones.

### Anywhere else

Build and upload `dist/`. It works as-is on Netlify, Cloudflare Pages,
S3 + CloudFront, GitHub Pages, or any static host — no server-side runtime, no
redirects to configure.

```bash
npm run build
```

## How it's put together

```
src/
  layout.html        the HTML shell every page is poured into
  partials/          nav + footer, shared verbatim by all eight pages
  pages/*.html       one file per page: JSON front matter, then the body
assets/
  ds/                the design-system export, copied verbatim
  css/site.css       everything else
  js/site.js         nav, current-page marker, contact form
  img/               logo lockup + mark
build.js             assembles src/ into dist/
```

`build.js` reads each page's leading `<!--{ … }-->` JSON block for its title and
description, drops the body into `layout.html` along with the nav and footer
partials, and copies `assets/` and `public/` across. Rerun it after any edit.

### Drafts

A page with `"draft": true` in its front matter is skipped by the build. Two are
held back today:

| Page | Why | To re-enable |
| --- | --- | --- |
| `technology.html` | Not shipping for now. | Drop the `draft` flag, restore the Technology entry in `src/partials/nav.html` and `footer.html`, and put back the "Explore the engine" CTA on Home, "How it works ↗" on Home, and "The engine behind it ↗" on Venues and Automotive. |
| `aqademiq.html` | Every Aqademiq link now points at **aqademiq.com**, so the internal page has no inbound links. | Drop the `draft` flag and point the three links back at `aqademiq.html`. |

The build prints what it held back, so a draft can't go unnoticed:

```
Built 6 pages -> dist/
Held back as draft: aqademiq.html, technology.html
```

### External links

The three Aqademiq links — header nav, footer, and the Home product card —
open `https://aqademiq.com` in a new tab with `rel="noopener noreferrer"` and a
screen-reader-only "(opens in a new tab)" note.

### The design system

`assets/ds/` is an unmodified copy of the export that came with the handoff —
tokens for colour, type, spacing, radii, shadows and motion, plus the Plus
Jakarta Sans variable fonts. **Don't edit anything in there.** When the design
system is re-exported, replace the whole folder.

`assets/css/site.css` layers the site on top of it. The marketing pages use a
warmer and darker slice of the palette than the DS semantic aliases cover, so
the page-level surface and text ramps are declared at the top of that file and
mapped onto the DS primitives where they line up.

Two conventions worth knowing before editing CSS:

- **Section rhythm** — the designs set bespoke top/bottom padding on nearly every
  section, so `.section` reads it from `--pt` / `--pb` set in the markup. Mobile
  scales both proportionally rather than replacing them.
- **`--measure` and `.mt-*`** — headings and paragraphs carry a per-instance
  max-width and top margin in the design. Those live as `--measure` and the
  `.mt-*` utilities so the exact values stay visible in the markup.

## Contact form

The form validates client-side and then shows the "Got it." confirmation. With
no endpoint configured it confirms locally, exactly as the prototype does —
**nothing is sent anywhere yet.**

To make it live, add an endpoint to the `<form>` in `src/pages/contact.html`:

```html
<form class="form" data-contact-form data-endpoint="https://…" novalidate>
```

It will `POST` the fields as JSON (`name`, `email`, `topic`, `message`) and fall
back to a visible error pointing at hello@r13labs.com if the request fails.

## What differs from the prototypes

The prototypes in `design/` are fixed-width desktop compositions rendered by a
design-tool runtime. The visual output is reproduced as-is; these are the
deliberate additions:

- **Responsive layout.** Breakpoints at 1100/980/900/860/680/480px, plus a
  short-viewport rule for phones and small tablets held in landscape. Below
  900px the navigation collapses into a scrollable disclosure panel; card grids
  step 3 → 2 → 1. Verified with no horizontal scroll, clipped content, or
  wrapped navigation across 78 device × page combinations from 320px to 2560px,
  including both orientations of iPhone, iPad, iPad Pro, and laptop/desktop
  sizes up to 5K.
- **Touch support.** Hover-to-open on the Products menu is gated behind
  `(hover: hover) and (pointer: fine)`. A width-only check would break tablets:
  a tap fires `mouseenter` *and* `click`, so the menu would open and instantly
  toggle shut.
- **Real semantics and keyboard support.** The Products menu is a `<button>` with
  `aria-expanded` that opens on hover, click, or keyboard, and closes on Escape
  or outside click. There's a skip link, and the current page is marked with
  `aria-current`.
- **Reduced motion.** `prefers-reduced-motion` resolves the whole decorative
  motion layer to its resting state — the design already ships a static variant
  of the hero wave, so this matches intent.
- **Form validation.** The prototype's send button had no validation behind it.
- **Card hover animation is CSS.** The prototype drove it from JS state; the
  result is identical and it now works on focus too.

## Known gaps

- **Privacy Policy** links to `#`. The design left it unresolved; there's a TODO
  on it in `src/partials/footer.html`.
- **No sitemap.** `public/robots.txt` has the line to uncomment once the
  production domain is settled.
- **`design/` also contains `-endel-v1` variants** of every page. Those are
  earlier alternates; the unsuffixed files are what's built here.
- **Home's hero has one CTA**, not the two in the design — "Explore the engine"
  went with the Technology page. Same for the secondary CTA on Venues and
  Automotive. Restoring Technology restores all of them.
