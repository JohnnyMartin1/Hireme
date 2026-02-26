# Favicons – What to Replace for Google Search (and Tabs)

**To change only the icon that appears in Google search results (and in browser tabs):** replace the files below in the `public` folder with your new versions. Use the **exact filenames** and **sizes** listed. Do **not** change `logo.svg` if you want the main website header/logo to stay the same.

---

## Files that affect Google search and browser tab

| File in `public/`        | Replace with your new file | Size / format   |
|---------------------------|----------------------------|-----------------|
| **favicon.ico**           | Same name                  | 32×32 or 16×32 (ICO) |
| **favicon.svg**           | Same name                  | SVG (any size)  |
| **favicon-16x16.png**     | Same name                  | 16×16 PNG       |
| **favicon-32x32.png**     | Same name                  | 32×32 PNG       |
| **apple-touch-icon.png**  | Same name                  | 180×180 PNG     |

Optional (PWA / “Add to home screen”):

| File in `public/`             | Replace with your new file | Size / format |
|--------------------------------|----------------------------|----------------|
| **android-chrome-192x192.png** | Same name                  | 192×192 PNG    |
| **android-chrome-512x512.png** | Same name                  | 512×512 PNG    |

`site.webmanifest` points to the android-chrome files; keep those filenames if you replace the images.

---

## Do not change (if you want the site itself unchanged)

- **logo.svg** – used for the main HireMe logo on the website (header, etc.). Leave as-is if you only want to change the Google/search icon.
- **brand/** – other branding assets used on the site.

---

## How to replace

1. Export or generate your new favicons (e.g. from RealFaviconGenerator or your design tool).
2. Rename each file to match the table above **exactly** (e.g. `favicon.ico`, `favicon.svg`, not `favicon-new.ico`).
3. Put them in the **`public`** folder (same folder that contains `logo.svg`), overwriting the existing files.
4. Deploy. The site and Google will then use these icons.

Google may take time to update search results (hours to a few days). You can request re-indexing in Google Search Console to speed it up.
