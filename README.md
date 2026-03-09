# ITDSMI Website

Static website for the ITDSMI – Frackmobil & Alumni association.
Live at: **https://itdsmi.ch**

---

## Local development

The site uses `fetch()` to load `images/manifest.json`, so it must be served over HTTP (not opened directly as a `file://` URL).

**Option A — Node (no install needed, Node ≥ 18):**
```bash
npx serve .
# → http://localhost:3000
```

**Option B — Python:**
```bash
python3 -m http.server 8080
# → http://localhost:8080
```

**Option C — VS Code:**
Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension, right-click `index.html` → *Open with Live Server*.

---

## Adding a blog entry

1. Create the folder and a `date` file:
   ```
   blog/frackwoche-2026/
     date          ← plain text, e.g. "Sept. 2026"
     index.html    ← copy from an existing entry, keep the <!-- MARKER --> comments
     images/
       IMG_001.jpg
       IMG_002.jpg
       # or grouped into steps:
       step1/IMG_001.jpg
       step2/IMG_001.jpg
   ```

2. Run the build script from the repo root:
   ```bash
   node blog/generate-manifest.js
   ```
   This will:
   - Scan `images/` and write `images/manifest.json`
   - Update `blog/blog-index.json`
   - Inject the shared header/footer/sidebar into the entry's `index.html`
   - Update the blog list in the root `index.html`

3. Commit and push to `main` — GitHub Actions will deploy automatically.

---

## Project structure

```
.
├── index.html              # Root landing page
├── style.css               # Global styles
├── logo-dunkel.jpg
├── .nojekyll               # Disables Jekyll on GitHub Pages
├── _partials/              # Shared HTML snippets (injected at build time)
│   ├── header.html
│   ├── footer.html
│   └── sidebar-blog.html
└── blog/
    ├── generate-manifest.js  # Build script
    ├── blog-index.json        # Auto-generated entry list
    └── frackwoche-2025/
        ├── index.html
        ├── date
        └── images/
            ├── manifest.json  # Auto-generated image manifest
            └── *.jpg
```

## GitHub Actions

Workflow at `.github/workflows/deploy.yml`:
- Triggers on every push to `main`
- Runs `node blog/generate-manifest.js`
- Deploys to GitHub Pages via the official `deploy-pages` action

Make sure **GitHub Pages** is configured to use **GitHub Actions** as the source
(repo Settings → Pages → Source → *GitHub Actions*).
