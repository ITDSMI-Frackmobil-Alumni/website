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

1. Create the entry folder with `metadata.json`:
   ```
   blog/frackwoche-2026/
     metadata.json  ← entry metadata (title, date, intro text)
     images/
       IMG_001.jpg
       IMG_002.jpg
       # or grouped into steps:
       step1/IMG_001.jpg
       step2/IMG_001.jpg
   ```

   The `metadata.json` file should contain:
   ```json
   {
     "title": "Frackwoche 2026",
     "date": "September 2026",
     "intro": "Eindrücke und Fotos vom Frackwoche 2026."
   }
   ```

2. Run the build script from the repo root:
   ```bash
   node blog/generate-manifest.js
   ```
   This will:
   - Generate `index.html` from the template with your metadata
   - Scan `images/` and write `images/manifest.json`
   - Update `blog/blog-index.json`
   - Inject the shared header/footer/sidebar
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
    ├── template.html         # Template for generating blog entry pages
    ├── generate-manifest.js  # Build script
    ├── blog-index.json        # Auto-generated entry list
    └── frackwoche-2025/
        ├── metadata.json      # Entry metadata (title, date, intro)
        ├── index.html         # Auto-generated from template
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
