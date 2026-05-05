# Favicons – Google Search and browser tab

**What actually drives the icon in Google Search and the browser tab**

- **`app/layout.tsx`** `metadata.icons` emits `<link rel="icon" …>` (and Apple touch) on every page. That list is the **primary** signal for crawlers and includes:
  - `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png` (legacy / small)
  - **`android-chrome-192x192.png`** and **`android-chrome-512x512.png`** (square, ≥48px effective for Google; full-bleed artwork)
  - **`favicon.svg`** (`image/svg+xml`) for modern browsers
- **`public/site.webmanifest`** lists the same **192** and **512** PNG paths for PWA / “Add to home screen” (must stay in sync with `metadata` for those assets).
- **`logo.svg`** is **not** used as the favicon. It remains the **on-site header logo** and **Open Graph / Twitter** preview image only.

**Cache busting:** icon and manifest URLs use a shared query (e.g. `?v=2`) so CDN/Google/browsers fetch new bytes after you replace files. **Bump the version** in `app/layout.tsx` (`ICON_CACHE`) and in **`public/site.webmanifest`** icon `src` values when you ship new icon files.

---

## Files to replace when updating the search/tab icon

| File in `public/`              | Size / format   |
|--------------------------------|-----------------|
| **favicon.ico**                | Multi-size ICO |
| **favicon.svg**                | SVG (square artboard) |
| **favicon-16x16.png**         | 16×16 PNG       |
| **favicon-32x32.png**         | 32×32 PNG       |
| **apple-touch-icon.png**       | 180×180 PNG     |
| **android-chrome-192x192.png** | 192×192 PNG     |
| **android-chrome-512x512.png** | 512×512 PNG     |

Use **full-bleed** artwork in the square PNGs (minimal transparent padding) so Google’s circular crop looks correct.

---

## Do not change (if you want the site header unchanged)

- **logo.svg** – main HireMe logo in the UI (not the favicon).
- **brand/** – other branding assets.

---

## After replacing files

1. Match filenames above exactly.
2. Bump **`ICON_CACHE`** in `app/layout.tsx` and the `?v=` query on manifest icon `src` entries in **`site.webmanifest`**.
3. Deploy and request re-indexing in Google Search Console if needed.

Google can take hours to days to refresh the SERP favicon.
