# Landing Page — Developer Guide

The public homepage (`/`) is a server component that composes client-side sections from `src/components/home/`. Copy and sample metadata live in JSON; pricing and FAQ strings are derived from env-backed product copy.

## Page structure

`src/app/page.tsx` renders sections in this order:

| Order | Component | Purpose |
|-------|-----------|---------|
| 1 | `LandingHero` | Cinematic video portal, headline, 3-card sample carousel |
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

> `SampleShowcase` (before/after marquee) is **not** mounted on `/` anymore. It remains available for reuse; pair config still lives in `home-content.json` → `showcase`.

## Content sources

| Source | File | What it controls |
|--------|------|------------------|
| Hero, stats, showcase pairs, report samples | `src/content/home-content.json` | Marketing copy + sample image references |
| Loader + types | `src/lib/home-content.ts` | `HOME_CONTENT`, `toReportSampleItems()`, `toBeforeAfterItems()` |
| Features, journey steps, FAQs | `src/lib/landing-content.ts` | `LANDING_FEATURES`, `LANDING_STEPS`, `getLandingFaqs()` |
| Plan cards | `src/lib/landing-pricing.ts` | `getLandingPlans()`, `fmtInr()` |
| Product strings | `src/lib/product-copy.ts` | Shared copy for FAQs and unlock messaging |
| Carousel deck layout | `src/lib/animations.ts` | `getDeckLayout()`, `carouselDeckSpring`, `carouselDeckExitEase` |

**Rule:** Edit JSON for static marketing text. Use `landing-content.ts` when copy must interpolate prices from `publicEnv.razorpay.*`.

## Sample infographic images

Landing samples use a **canonical path convention** so hero carousel and gallery stay aligned with real report section IDs.

```
public/samples/report/{sectionId}.jpg
```

`toReportSampleItems()` in `home-content.ts` always sets `imageSrc` to `/samples/report/{id}.jpg`. Each entry in `home-content.json` may also set `imageFile` as a **legacy fallback** used when the canonical file is missing (`onError` handler in `HeroReportCard` and `ReportSampleGallery`).

### Current report sample IDs

| `id` in JSON | Canonical file | Notes |
|--------------|----------------|-------|
| `faceFeatures` | `report/faceFeatures.jpg` | Hero carousel chapter I (first of 3) |
| `skin` | `report/skin.jpg` | Hero carousel chapter II |
| `color` | `report/color.jpg` | Hero carousel chapter III |
| `hairstyle` | — | Falls back to `imageFile` (`sample-2-after.jpg`) until a dedicated file exists |
| `spectacles` | — | Falls back to `sample-3-after.jpg` |
| `hairColor` | — | Falls back to `sample-2.jpg` |

`public/samples/report/faceFeaturesPreview.jpg` exists for the free preview tier but is **not** used on the landing gallery (samples showcase paid-tier boards).

### Updating a sample image

1. Export or generate the infographic at roughly **3:4 portrait** aspect ratio.
2. Save to `public/samples/report/{sectionId}.jpg` (match the `id` in `home-content.json`).
3. Optionally update `imageFile` in JSON if you want a different fallback.
4. Run `npm run dev` and verify hero carousel + `#samples` gallery — both use `object-cover object-top` on `--infographic-frame` background.

## Key components

### `LandingHero`

Composition (top to bottom, z-order):

1. `ActivityTicker` — live social-proof ticker
2. `HeroVideoPortal` — elliptical masked background video (right on desktop, bottom on mobile)
3. `heroScrim` + `heroBackdrop` — left-weighted gradient scrim and dot grid
4. `LandingJourneyBanner` — slim journey strip
5. Two-column grid: `HeroText` (copy) + `HeroReportCard` (carousel)

Hero-specific layout lives in `src/app/home.module.css` (`.heroSurface`, `.heroVideoPortal*`, `.heroCarousel*`).

### `HeroVideoPortal`

Extracted client component for the cinematic vanity portal behind the headline.

| Asset | Path |
|-------|------|
| Loop video | `/Website%20Hero%20Background.mp4` |
| Poster (also reduced-motion fallback) | `/1779024315.png` |

Behavior:

- `IntersectionObserver` at `threshold: 0.12` — play when visible, pause when off-screen
- `muted`, `loop`, `playsInline`, `preload="metadata"`
- When `useReducedMotion()` is true, renders a static `Image` poster instead of `<video>`
- CSS: elliptical `clip-path`, drift/sheen/pulse keyframes; disabled under `prefers-reduced-motion`

Prompt reference for regenerating the hero loop: `docs/video-promo-prompt.md` → **Website Hero Background (16:9, Loopable)**.

### `HeroReportCard`

3-card **dossier deck carousel** of the **first three** `reportSamples` entries (`toReportSampleItems().slice(0, 3)`).

| Constant | Value | Purpose |
|----------|-------|---------|
| `AUTOPLAY_MS` | `4000` | Interval between auto-advances |
| Chapter labels | `I`, `II`, `III` | Roman-numeral tabs tied to sample order |

Interaction:

- Autoplay advances `(activeIndex + 1) % 3` unless paused or reduced motion
- Pauses on `mouseenter`, `focus`, and resumes on leave/blur
- Chapter tabs (`role="tablist"`) call `goTo(index)` and reset the autoplay timer
- Active card: `aria-live` chapter label; peek cards are `aria-hidden`
- Progress bar (`--carousel-progress-ms`) mirrors autoplay; pauses with hover/focus

Animation (`src/lib/animations.ts`):

- `getDeckLayout(index, activeIndex, total, reducedMotion)` — returns `active` \| `peekNext` \| `peekPrev` \| `hidden` with x/y/scale/rotate/zIndex
- Active card centered; next card offset right (+48px, +5°); prev offset left (−42px, −7°)
- Transitions: `carouselDeckSpring` for deck moves; `carouselDeckExitEase` for the lifting exit on the outgoing card
- Reduced motion: only the active card is visible (peeks hidden)

Unit tests: `src/lib/animations.deck.test.ts`.

### `ReportSampleGallery`

- Full variant: section `id="samples"` (secondary CTA `/#samples` in hero)
- Promo video: `/e6672f79-03ed-48f9-8259-eacd582aba8d.mp4` (plays when scrolled into view, `threshold: 0.25`)
- `compact` variant: single card — used elsewhere if needed

This promo video is **separate** from the hero background loop in `HeroVideoPortal`.

## Design tokens (Atelier Dossier)

Landing uses the app-wide dossier theme in `src/app/globals.css`:

- `--infographic-frame` — neutral backdrop behind infographic images
- `.foil-label` — small caps section labels
- `.dossier-card` — elevated sample/pricing cards
- `.gradient-text` — accent headline spans
- `font-display` — Lora headings; body uses Raleway via theme

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

- **Wrong sample path:** Adding `imageFile` alone is not enough — prefer `public/samples/report/{id}.jpg` so hero carousel and gallery stay consistent.
- **Hero vs gallery video:** Do not swap the hero loop (`Website Hero Background.mp4`) with the analysis promo (`e6672f79-…mp4`); they serve different sections and aspect treatments.
- **Carousel order:** Hero shows only the **first three** `reportSamples` in JSON order. Reorder entries there to change which chapters appear in the hero.
- **Free vs paid samples:** The gallery tags all six entries as "Full report". Do not use `faceFeaturesPreview` as a landing sample ID unless intentionally showcasing the free tier.
- **Hardcoded testimonials:** Quotes in `page.tsx` are not driven by JSON; update inline when refreshing social proof.
- **Stale design-system MASTER:** `design-system/renovaara/MASTER.md` predates the Atelier Dossier refresh. Trust `globals.css` and live components over that file for landing work.
