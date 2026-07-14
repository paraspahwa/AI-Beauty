# Landing Page — Developer Guide

The public homepage (`/`) is a server component that composes client-side sections from `src/components/home/`. Copy and sample metadata live in JSON; pricing and FAQ strings are derived from env-backed product copy.

## Page structure

`src/app/page.tsx` renders sections in this order:

| Order | Component | Purpose |
|-------|-----------|---------|
| 1 | `LandingHero` | Video background, headline, hero fan of sample infographics |
| 2 | `ProofStrip` | Animated stat counters from `HOME_CONTENT.stats` |
| 3 | `ReportSampleGallery` | Horizontal scroll of six report samples (`#samples` anchor) |
| 4 | `JourneyTimeline` | Five-step product journey |
| 5 | `ChapterSpreads` | Feature chapter cards |
| 6 | `LandingPricing` | One-time unlock + Style Guide add-on pricing |
| 7 | `TestimonialsSection` | Static testimonial quotes (inline in `page.tsx`) |
| 8 | `FAQAccordion` | FAQs from `getLandingFaqs()` |
| 9 | `FinalCta` | Closing CTA banner |
| — | `StickyMobileCta` | Fixed mobile CTA (always mounted) |

Each major block (except FAQ) is wrapped in `RevealSection` for scroll-in animation.

## Content sources

| Source | File | What it controls |
|--------|------|------------------|
| Hero, stats, showcase pairs, report samples | `src/content/home-content.json` | Marketing copy + sample image references |
| Loader + types | `src/lib/home-content.ts` | `HOME_CONTENT`, `toReportSampleItems()`, `toBeforeAfterItems()` |
| Features, journey steps, FAQs | `src/lib/landing-content.ts` | `LANDING_FEATURES`, `LANDING_STEPS`, `getLandingFaqs()` |
| Plan cards | `src/lib/landing-pricing.ts` | `getLandingPlans()`, `fmtInr()` |
| Product strings | `src/lib/product-copy.ts` | Shared copy for FAQs and unlock messaging |

**Rule:** Edit JSON for static marketing text. Use `landing-content.ts` when copy must interpolate prices from `publicEnv.razorpay.*`.

## Sample infographic images

Landing samples use a **canonical path convention** so hero and gallery stay aligned with real report section IDs.

```
public/samples/report/{sectionId}.jpg
```

`toReportSampleItems()` in `home-content.ts` always sets `imageSrc` to `/samples/report/{id}.jpg`. Each entry in `home-content.json` may also set `imageFile` as a **legacy fallback** used when the canonical file is missing (`onError` handler in `HeroReportCard` and `ReportSampleGallery`).

### Current report sample IDs

| `id` in JSON | Canonical file | Notes |
|--------------|----------------|-------|
| `faceFeatures` | `report/faceFeatures.jpg` | Full face-features board (hero shows first 3 samples) |
| `skin` | `report/skin.jpg` | |
| `color` | `report/color.jpg` | |
| `hairstyle` | — | Falls back to `imageFile` (`sample-2-after.jpg`) until a dedicated file exists |
| `spectacles` | — | Falls back to `sample-3-after.jpg` |
| `hairColor` | — | Falls back to `sample-2.jpg` |

`public/samples/report/faceFeaturesPreview.jpg` exists for the free preview tier but is **not** used on the landing gallery (samples showcase paid-tier boards).

### Updating a sample image

1. Export or generate the infographic at roughly **3:4 portrait** aspect ratio.
2. Save to `public/samples/report/{sectionId}.jpg` (match the `id` in `home-content.json`).
3. Optionally update `imageFile` in JSON if you want a different fallback.
4. Run `npm run dev` and verify hero fan + `#samples` gallery — both use `object-cover object-top` on `--infographic-frame` background.

## Key components

### `LandingHero`

- Background video: `/Website%20Hero%20Background.mp4` with poster `/1779024315.png`
- `HeroText` reads hero copy from `HOME_CONTENT.hero`
- `HeroReportCard` shows a fanned stack of the **first three** `reportSamples` entries

### `ReportSampleGallery`

- Full variant: section `id="samples"` (secondary CTA `/#samples` in hero)
- Promo video: `/e6672f79-03ed-48f9-8259-eacd582aba8d.mp4` (plays when scrolled into view)
- `compact` variant: single card — used elsewhere if needed

### `SampleShowcase`

Before/after marquee pairs from `HOME_CONTENT.showcase.pairs`. Paths resolve under `/samples/` via `toBeforeAfterItems()`. Tuning (marquee speed, card size) is in `showcase.tuning`.

## Design tokens (Atelier Dossier)

Landing uses the app-wide dossier theme in `src/app/globals.css`:

- `--infographic-frame` — neutral backdrop behind infographic images
- `.foil-label` — small caps section labels
- `.dossier-card` — elevated sample/pricing cards
- `.gradient-text` — accent headline spans
- `font-display` — Lora headings; body uses Raleway via theme

Hero-specific layout and fan animation live in `src/app/home.module.css`.

## SEO

`page.tsx` embeds two JSON-LD blocks:

1. `SoftwareApplication` — free preview + unlock pricing from `reportPriceLabel`
2. `FAQPage` — mirrors `getLandingFaqs()` for rich results

See `docs/SEO_NEXT_STEPS.md` for OG images and further SEO work.

## Local development

```bash
npm run dev
# open http://localhost:3000
```

No env vars are required to render the landing page. Pricing labels read `NEXT_PUBLIC_*` Razorpay price env vars (defaults apply if unset).

## Common pitfalls

- **Wrong sample path:** Adding `imageFile` alone is not enough — prefer `public/samples/report/{id}.jpg` so hero and gallery stay consistent.
- **Free vs paid samples:** The gallery tags all six entries as "Full report". Do not use `faceFeaturesPreview` as a landing sample ID unless intentionally showcasing the free tier.
- **Hardcoded testimonials:** Quotes in `page.tsx` are not driven by JSON; update inline when refreshing social proof.
- **Stale design-system MASTER:** `design-system/renovaara/MASTER.md` predates the Atelier Dossier refresh. Trust `globals.css` and live components over that file for landing work.
