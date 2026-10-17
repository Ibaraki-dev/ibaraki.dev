# SEO / social sharing

- Shared card asset: `/og/ibaraki-dev-v1.png`, 1200×630 PNG. Captured from the same WebGL logo and self-hosted typefaces as the homepage. Source layout: `docs/design/og-source/og-preview.astro.txt` (temporarily copy as `src/pages/og-preview.astro`, build, open `/og-preview/` at1200×630, wait until data-assembly=settled, capture, then remove route and rebuild). No navigation or time-sensitive event date in the artwork.
- Every public page has a unique description, title, canonical and `og:url`; common brand image, image dimensions/type/alt, Japanese locale and site name. Explicit X `summary_large_image`, title, description, image and alt. No unverified community X handle added.
- WebSite and Organization JSON-LD on home, using actual community connpass/GitHub links. No invented ratings, event dates, or physical business address.
- Sitemap and robots.txt point at the configured site origin; 404 has noindex. All metadata is in static HTML, so social crawlers do not need WebGL or JavaScript.
- Migration: set `SITE_URL=https://ibaraki.dev`, rebuild/deploy after DNS/domain activation, redirect the old origin and submit the canonical sitemap in Google Search Console. Current canonical remains the working Workers hostname until migration.
- Validate after build: `node scripts/check-seo.mjs`. This checks all5public pages, unique descriptions, schema, sitemap, robots, 404 and image dimensions/size.
- Actual X post rendering/indexing is platform-controlled. No post was sent. Public retrieval with Twitterbot user-agent is checked, but it does not prove X has refreshed its cache. Use a new image version filename for future artwork updates.

References: [Google metadata](https://developers.google.com/search/docs/crawling-indexing/valid-page-metadata), [Organization structured data](https://developers.google.com/search/docs/appearance/structured-data/organization), [canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).
