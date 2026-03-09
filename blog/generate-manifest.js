#!/usr/bin/env node
// Build script — run from the blog/ directory or repo root.
//
// What it does:
//   1. For each blog entry with images/:
//      - Generates images/manifest.json (supports flat & grouped layouts)
//   2. Generates blog-index.json at blog level
//   3. Injects shared partials (_partials/header, footer, sidebar) into each
//      blog entry's index.html using <!-- MARKER --> comments
//   4. Injects the blog list into the root index.html
//
// Usage:
//   node blog/generate-manifest.js                  # all entries
//   node blog/generate-manifest.js frackwoche-2025  # one entry only

const fs   = require('fs');
const path = require('path');

// ── Paths ─────────────────────────────────────────────────────────────────────
const BLOG_DIR   = __dirname;
const SITE_ROOT  = path.join(BLOG_DIR, '..');
const INDEX_HTML = path.join(SITE_ROOT, 'index.html');
const PARTIALS   = path.join(SITE_ROOT, '_partials');

const IMG_EXTS = new Set(['.jpg', '.jpeg', '.png']);

// ── Helpers ───────────────────────────────────────────────────────────────────
function isImage(name) {
  return IMG_EXTS.has(path.extname(name).toLowerCase());
}

function prettyName(dirName) {
  return dirName.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function readPartial(name) {
  const p = path.join(PARTIALS, name);
  if (!fs.existsSync(p)) throw new Error(`Partial not found: ${p}`);
  return fs.readFileSync(p, 'utf8');
}

/** Replace content between <!-- MARKER_START --> and <!-- MARKER_END --> */
function inject(content, marker, replacement) {
  const re = new RegExp(
    `<!-- ${marker}_START -->[\\s\\S]*?<!-- ${marker}_END -->`, 'g'
  );
  if (!re.test(content)) {
    console.warn(`  Warning: ${marker} markers not found`);
    return content;
  }
  re.lastIndex = 0;
  return content.replace(re,
    `<!-- ${marker}_START -->\n${replacement}\n                    <!-- ${marker}_END -->`
  );
}

// ── 1. Image manifest ─────────────────────────────────────────────────────────
function generateManifestFor(entryDir) {
  const imagesDir = path.join(entryDir, 'images');
  if (!fs.existsSync(imagesDir)) {
    console.log(`  Skipping ${path.basename(entryDir)}: no images/ directory`);
    return;
  }

  const entryName = path.basename(entryDir);
  const entries   = fs.readdirSync(imagesDir, { withFileTypes: true });
  const subdirs   = entries.filter(d => d.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));
  const flatImgs  = entries.filter(d => d.isFile() && isImage(d.name)).sort((a, b) => a.name.localeCompare(b.name));

  let steps = [];

  if (subdirs.length > 0) {
    // Grouped layout: images/stepA/*.jpg
    steps = subdirs.map(d => {
      const images = fs.readdirSync(path.join(imagesDir, d.name))
        .filter(isImage).sort();
      return { name: prettyName(d.name), dir: d.name, images };
    }).filter(s => s.images.length > 0);
  }

  if (flatImgs.length > 0) {
    // Flat layout: images/*.jpg — treated as a single group
    steps.push({ name: prettyName(entryName), dir: '.', images: flatImgs.map(f => f.name) });
  }

  const out = path.join(imagesDir, 'manifest.json');
  fs.writeFileSync(out, JSON.stringify({ steps }, null, 2) + '\n');
  const total = steps.reduce((n, s) => n + s.images.length, 0);
  console.log(`  manifest: ${total} image(s) in ${steps.length} step(s) → ${path.relative(SITE_ROOT, out)}`);
}

// ── 2. Blog index ─────────────────────────────────────────────────────────────
function buildBlogEntries() {
  return fs.readdirSync(BLOG_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .sort((a, b) => b.name.localeCompare(a.name))
    .map(d => {
      const datePath = path.join(BLOG_DIR, d.name, 'date');
      const date = fs.existsSync(datePath) ? fs.readFileSync(datePath, 'utf8').trim() : '';
      return { dir: d.name, title: prettyName(d.name), date };
    });
}

function generateBlogIndex(entries) {
  const out = path.join(BLOG_DIR, 'blog-index.json');
  fs.writeFileSync(out, JSON.stringify({ entries }, null, 2) + '\n');
  console.log(`  blog-index.json written`);
}

// ── 3. Inject partials into blog entry index.html ─────────────────────────────
function injectPartialsInto(entryDir, blogEntries) {
  const htmlPath = path.join(entryDir, 'index.html');
  if (!fs.existsSync(htmlPath)) return;

  const dirName = path.basename(entryDir);
  // Root relative to this entry: blog/frackwoche-2025/ → ../../
  const depth   = path.relative(SITE_ROOT, entryDir).split(path.sep).length;
  const root    = '../'.repeat(depth);

  const applyRoot = s => s.replace(/\{\{ROOT\}\}/g, root);

  let content = fs.readFileSync(htmlPath, 'utf8');

  // Header
  content = inject(content, 'HEADER', applyRoot(readPartial('header.html')));

  // Footer
  content = inject(content, 'FOOTER', applyRoot(readPartial('footer.html')));

  // Sidebar (with blog list injected inside it)
  let sidebar = applyRoot(readPartial('sidebar-blog.html'));
  const blogListHtml = blogEntries.map(e => {
    const isActive = e.dir === dirName ? ' active' : '';
    return (
      `                <a href="${root}blog/${e.dir}/" class="blog-preview${isActive}">\n` +
      `                    <span class="blog-date">${e.date}</span>\n` +
      `                    <span class="blog-title">${e.title}</span>\n` +
      `                </a>`
    );
  }).join('\n');
  sidebar = inject(sidebar, 'BLOG_LIST', blogListHtml);
  content = inject(content, 'SIDEBAR', sidebar.trimEnd());

  fs.writeFileSync(htmlPath, content);
  console.log(`  partials injected → ${path.relative(SITE_ROOT, htmlPath)}`);
}

// ── 4. Inject blog list into root index.html ──────────────────────────────────
function injectRootBlogList(entries) {
  if (!fs.existsSync(INDEX_HTML)) {
    console.warn('  Warning: root index.html not found');
    return;
  }
  const html = entries.map(e =>
    `                <a href="blog/${e.dir}/" class="blog-preview">\n` +
    `                    <span class="blog-date">${e.date}</span>\n` +
    `                    <span class="blog-title">${e.title}</span>\n` +
    `                </a>`
  ).join('\n');

  let content = fs.readFileSync(INDEX_HTML, 'utf8');
  content = inject(content, 'BLOG_LIST', html);
  fs.writeFileSync(INDEX_HTML, content);
  console.log(`  blog list injected → index.html`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
const target = process.argv[2];

if (target) {
  const entryDir = path.join(BLOG_DIR, target);
  console.log(`Building ${target}...`);
  generateManifestFor(entryDir);
  const entries = buildBlogEntries();
  injectPartialsInto(entryDir, entries);
  console.log('Done.');
} else {
  const entries = buildBlogEntries();

  console.log('1/3  Image manifests...');
  fs.readdirSync(BLOG_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .forEach(d => generateManifestFor(path.join(BLOG_DIR, d.name)));

  console.log('2/3  Blog index...');
  generateBlogIndex(entries);
  injectRootBlogList(entries);

  console.log('3/3  Partials...');
  fs.readdirSync(BLOG_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .forEach(d => injectPartialsInto(path.join(BLOG_DIR, d.name), entries));

  console.log('\nDone.');
}
