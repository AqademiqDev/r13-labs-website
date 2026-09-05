# R13 Labs — website

The R13 Labs marketing site, built from the Claude Design handoff in `design/`.

Seven pages ship: Home, Technology, Science, Company, Contact, Prism Venues,
Prism Automotive.

One more exists in `src/pages/` but is **held back from the build** — see
[Drafts](#drafts).

## Running it

```bash
npm run dev
```

Builds `dist/` and serves it at http://localhost:4173. `npm run build` builds
only. There are no dependencies — the build and the dev server are two small
Node scripts.

`npm test` runs the unit tests on Node's built-in runner — also no
dependencies. They cover the Technology page's confidence model; see
[The confidence demo](#the-confidence-demo).

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
  js/site.js         nav, current-page marker, contact form, confidence demo
  js/confidence.js   the confidence model — no DOM, so it can be tested
  img/               logo lockup + mark
test/                unit tests, run by `npm test`
build.js             assembles src/ into dist/
```

`build.js` reads each page's leading `<!--{ … }-->` JSON block for its title and
description, drops the body into `layout.html` along with the nav and footer
partials, and copies `assets/` and `public/` across. Rerun it after any edit.

### Drafts

A page with `"draft": true` in its front matter is skipped by the build. One is
held back today:

| Page | Why | To re-enable |
| --- | --- | --- |
| `aqademiq.html` | Every Aqademiq link now points at **aqademiq.com**, so the internal page has no inbound links. | Drop the `draft` flag and point the three links back at `aqademiq.html`. |

The build prints what it held back, so a draft can't go unnoticed:

```
Built 7 pages -> dist/
Held back as draft: aqademiq.html
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

## The confidence demo

The panel on Technology is the only real logic on the site. Six signal toggles;
turning any of them off recomputes each of the four state dimensions as the
share of its weight table that is still available, and that percentage drives
the bar width, the colour band and the status line.

The model lives in [assets/js/confidence.js](assets/js/confidence.js) and knows
nothing about the DOM, so it can be exercised directly — the weight tables, the
rounding, the three bands, and every branch of the status line are covered in
[test/confidence.test.js](test/confidence.test.js). `site.js` only binds the
toggles and writes the result back.

Two things to keep in mind when editing it:

- **The bands name themselves, they don't carry colours.** The model returns
  `high` / `mid` / `low`; the row carries it as `data-band` and `site.css`
  resolves it against `--conf-*`. Colours stay in one place.
- **The markup ships at full authority.** Every weight table sums to 1.00, so
  all-signals-on is 100% across the board — which is exactly what
  `technology.html` contains. The panel is correct before the script runs, and
  with it blocked entirely.

## Contact form

Submissions are emailed to **support@aqademiq.com**.

The form validates client-side, `POST`s JSON to `/api/contact`, and shows the
"Got it." confirmation. [api/contact.js](api/contact.js) is a Vercel serverless
function that revalidates the input and hands it to Resend's REST API — plain
`fetch`, no npm dependency. The visitor's address goes in `reply_to`, so
replying from the inbox goes straight back to them.

A hidden honeypot field catches basic form-spam bots; anything that fills it in
gets a `200` and is silently discarded.

### Setup — one-time, and the form will not deliver until it's done

1. Create a [Resend](https://resend.com) account and verify **r13labs.com** as a
   sending domain (add the DNS records it gives you).
2. In Vercel → Project → Settings → Environment Variables, add:

   | Name | Value |
   | --- | --- |
   | `RESEND_API_KEY` | your Resend API key |

3. Redeploy.

Optional overrides, both with sensible defaults: `CONTACT_TO`
(`support@aqademiq.com`) and `CONTACT_FROM` (`R13 Labs <website@r13labs.com>` —
this domain must be the verified one).

Without `RESEND_API_KEY` the function returns 500 and the form shows a visible
error pointing at support@aqademiq.com, so a misconfiguration is never silent.
The function is Vercel-only; `npm run dev` serves static files, so the form
falls back to the error path locally.

To swap providers, replace the single `fetch` call in `api/contact.js`. To go
back to the prototype's local-only confirmation, drop `data-endpoint` from the
`<form>` in `src/pages/contact.html`.

## Domain and SEO

Production is **https://r13labs.com**, set as `SITE_URL` in
[build.js](build.js). The build uses it for each page's `<link rel="canonical">`
and `og:url`, the absolute `og:image`, and `dist/sitemap.xml`, which is
generated from the non-draft pages so a held-back page can never leak into it.
`public/robots.txt` points at the sitemap.

Preview deploys keep canonicals pointing at production on purpose, so a preview
never competes with the real site in search. Override with a `SITE_URL`
environment variable if you ever need otherwise.

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
- **The architecture diagram drops its connectors below 700px.** The connector
  SVGs stretch horizontally on their own, but their endpoint x-coordinates are
  baked to the desktop column counts, so they stop meeting the cards once the
  grids reflow to 3 / 2 / 1 columns. They are hidden rather than redrawn and
  vertical order carries the flow — see the note in `site.css`.

## Known gaps

- **`RESEND_API_KEY` is not set yet.** The form will show its error state until
  it is — see [Setup](#setup--one-time-and-the-form-will-not-deliver-until-its-done).
- **The contact page displays `hello@r13labs.com`** as the email address, but
  form submissions go to support@aqademiq.com. Worth confirming the displayed
  address is a live mailbox, or changing it in `src/pages/contact.html`.
- **`og:image` is the logo lockup**, not a purpose-made social card. A 1200×630
  image would preview far better when links are shared.
- **`design/` also contains `-endel-v1` variants** of every page. Those are
  earlier alternates; the unsuffixed files are what's built here.
