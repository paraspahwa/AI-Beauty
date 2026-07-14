# Landing Page

Date: 2026-07-03

The marketing homepage (`/`) and the mobile **Home** tab share copy, pricing, and sample imagery. Web adds SEO schema, testimonials, and motion; mobile reuses the same content JSON and mirrors the section order.

## Section order

| # | Section | Web component | Mobile component |
|---|---|---|---|
| 1 | Hero | `LandingHero` | `LandingHero` + `LandingJourneyBanner` |
| 2 | Social proof | `ProofStrip` | inline stats row in `home.tsx` |
| 3 | Sample infographics | `ReportSampleGallery` | `ReportSampleGallery` |
| 4 | How it works | `JourneyTimeline` | `JourneyTimeline` |
| 5 | Report chapters | `ChapterSpreads` | — (web only) |
| 6 | Pricing | `LandingPricing` | `LandingPricing` |
| 7 | Testimonials | `TestimonialsSection` | — (web only) |
| 8 | FAQ | `FAQAccordion` | `FAQAccordion` |
| 9 | Final CTA | `FinalCta` | inline block in `home.tsx` |
| — | Sticky mobile CTA | `StickyMobileCta` | — (web only) |

Web entry: `src/app/page.tsx`. Mobile entry: `apps/mobile/app/(tabs)/home.tsx`.

## Content sources

### `src/content/home-content.json`

Single source of truth for hero copy, CTA banner, stats, before/after showcase pairs, and report sample metadata.

- Web loader: `src/lib/home-content.ts` — resolves image paths under `/public/samples/`.
- Mobile loader: `apps/mobile/lib/home-content.ts` — imports the same JSON via Metro `@web` alias; sample images are fetched from `EXPO_PUBLIC_API_BASE_URL/samples/…`.

**To change hero headline, stats, or CTA copy:** edit the JSON file only. Both platforms pick it up on rebuild.

### `src/lib/landing-content.ts`

Marketing-specific data that depends on runtime pricing or product copy:

- `LANDING_FEATURES` — infographic chapter descriptions (icons + copy).
- `LANDING_STEPS` — journey timeline steps; prices interpolated via `fmtInr(publicEnv.razorpay.*)`.
- `getLandingFaqs()` — FAQ items built from `PRODUCT_COPY` and live Razorpay prices.

### `src/lib/landing-pricing.ts`

Pricing cards for the homepage. Reads `publicEnv.razorpay.priceINR` and `styleGuidePriceINR`; delegates feature lists to `PRODUCT_COPY`.

### `src/lib/product-copy.ts`

Canonical product names and bullet lists for free preview, full report, and style guide add-on. Landing FAQs and pricing cards both reference this — keep wording consistent here.

## Sample images

| Asset type | Canonical path | Fallback |
|---|---|---|
| Report infographic samples | `/samples/report/{id}.jpg` | legacy path from `imageFile` in JSON |
| Before/after pairs | `/samples/{baseName}-{before\|after}.{ext}` | `sample-N-before.jpg` |

Regenerate or add assets under `public/samples/`. Optional script: `scripts/generate-homepage-images.ts`.

## Web-only concerns

- **SEO:** `SoftwareApplication` + `FAQPage` JSON-LD in `page.tsx`; sitemap includes `/`.
- **Motion:** sections wrapped in `RevealSection` (Framer Motion).
- **Testimonials:** hard-coded in `page.tsx` (`TESTIMONIALS` array) — not yet in shared JSON.

## Mobile constraints

- No `ChapterSpreads` or testimonials — smaller scroll surface; core conversion path only.
- CTAs route to `/upload` via Expo Router (`router.push("/upload")`).
- Requires auth for tabs; unauthenticated users land on **Account** to sign in first (`apps/mobile/app/(tabs)/_layout.tsx`).

## Developer checklist

1. Edit copy in `home-content.json` or `landing-content.ts` / `product-copy.ts` — not inline in components.
2. Run `npm run typecheck` (web) and `cd apps/mobile && npm run typecheck` after JSON shape changes.
3. Verify pricing displays after env changes (`NEXT_PUBLIC_PAID_PRICE_INR`, `NEXT_PUBLIC_STYLE_GUIDE_PRICE_INR`).
4. Confirm sample images exist at canonical paths before shipping.

## Related files

```
src/app/page.tsx
src/content/home-content.json
src/lib/home-content.ts
src/lib/landing-content.ts
src/lib/landing-pricing.ts
src/components/home/*
apps/mobile/app/(tabs)/home.tsx
apps/mobile/components/home/*
apps/mobile/lib/home-content.ts
```
