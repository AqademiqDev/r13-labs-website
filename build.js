#!/usr/bin/env node
/**
 * R13 Labs — static site build.
 *
 * Assembles `src/pages/*.html` into `dist/` using `src/layout.html` and the
 * shared partials in `src/partials/`. Zero dependencies, no bundling: pages
 * ship as plain HTML so they work over file:// as well as any static host.
 *
 * Each page starts with a JSON front-matter comment:
 *   <!--{ "page": "home", "title": "...", "description": "..." }-->
 *
 * Adding "draft": true holds a page back from the build. The source stays put
 * so re-enabling it is a one-word change — but remember to restore its links in
 * src/partials/ and the pages that pointed at it.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');

const read = (p) => fs.readFileSync(p, 'utf8');

/** Pull the leading `<!--{...}-->` JSON block off a page file. */
function splitFrontMatter(source, file) {
  const match = source.match(/^\s*<!--(\{[\s\S]*?\})-->\s*/);
  if (!match) throw new Error(`${file}: missing front-matter comment`);
  try {
    return { meta: JSON.parse(match[1]), body: source.slice(match[0].length) };
  } catch (err) {
    throw new Error(`${file}: invalid front-matter JSON — ${err.message}`);
  }
}

/** Replace {{key}} placeholders. Unknown keys throw rather than render blank. */
function fill(template, values, file) {
  return template.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`${file}: no value for {{${key}}}`);
    return values[key];
  });
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dest);
    else fs.copyFileSync(src, dest);
  }
}

function build() {
  const layout = read(path.join(SRC, 'layout.html'));
  const nav = read(path.join(SRC, 'partials', 'nav.html'));
  const footer = read(path.join(SRC, 'partials', 'footer.html'));

  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  const all = fs.readdirSync(path.join(SRC, 'pages')).filter((f) => f.endsWith('.html')).sort();
  const pages = [];
  const drafts = [];

  for (const file of all) {
    const source = read(path.join(SRC, 'pages', file));
    const { meta, body } = splitFrontMatter(source, file);

    if (meta.draft) {
      drafts.push(file);
      continue;
    }
    pages.push(file);

    const html = fill(
      layout,
      {
        page: meta.page,
        title: meta.title,
        description: meta.description,
        bodyClass: meta.bodyClass || '',
        nav,
        footer,
        content: body.trimEnd(),
      },
      file
    );
    fs.writeFileSync(path.join(DIST, file), html);
  }

  copyDir(path.join(ROOT, 'assets'), path.join(DIST, 'assets'));

  const extras = ['robots.txt', 'sitemap.xml'];
  for (const name of extras) {
    const src = path.join(ROOT, 'public', name);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(DIST, name));
  }

  console.log(`Built ${pages.length} pages -> dist/`);
  for (const file of pages) console.log(`  dist/${file}`);
  if (drafts.length) console.log(`Held back as draft: ${drafts.join(', ')}`);
}

build();
