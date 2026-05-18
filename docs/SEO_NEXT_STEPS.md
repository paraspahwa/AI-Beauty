# SEO & Discoverability — Next Steps & Recommendations

> **Status:** Sitemap, robots.txt, metadata, and webmanifest are live on `main`.  
> This document tracks everything still outstanding for full SEO readiness.

---

## 🔴 Priority 1 — Do Before Launch (Blockers)

### 1. Add `public/og-image.png`
- **Size:** 1200 × 630 px
- **Purpose:** Shown when the link is shared on WhatsApp, Twitter/X, LinkedIn, iMessage, etc.
- **Recommended content:** Renovaara logo + tagline + a mock report card screenshot on dark obsidian background
- **Tools:** Figma, Canva, or export from the landing page at 2×

### 2. Add `public/favicon.ico` + `public/apple-touch-icon.png`
- **favicon.ico** — 48 × 48 px, shown in browser tabs and bookmarks
- **apple-touch-icon.png** — 180 × 180 px, shown when the user adds the site to their iPhone home screen
- **Tools:** [realfavicongenerator.net](https://realfavicongenerator.net) — upload a single 512 × 512 SVG/PNG and it generates all sizes

### 3. Set `NEXT_PUBLIC_APP_URL` in Vercel
- Go to **Vercel → Project → Settings → Environment Variables**
- Add: `NEXT_PUBLIC_APP_URL = https://<your-production-domain>`
- Without this, sitemap and robots.txt URLs fall back to `https://renovaara.in` (the placeholder)
- **Redeploy** after adding

---

## 🟡 Priority 2 — Do Within First Week

### 4. Submit to Google Search Console
1. Go to [search.google.com/search-console](https://search.google.com/search-console)
2. Add property → **URL prefix** → `https://<your-domain>`
3. Verify via one of:
   - HTML meta tag (add to `src/app/layout.tsx` under `verification` key in metadata)
   - HTML file upload to `public/`
   - DNS TXT record in your domain registrar
4. Once verified → **Sitemaps** → Submit `https://<your-domain>/sitemap.xml`
5. Monitor **Coverage** tab for crawl errors

```ts
// Example: add to metadata in src/app/layout.tsx
verification: {
  google: "YOUR_GOOGLE_VERIFICATION_CODE",
},
```

### 5. Add Google OAuth Authorised Domain
- If you use Google Sign-In (Supabase Auth with Google provider):
  1. [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → OAuth consent screen
  2. Scroll to **Authorised domains** → Add your production domain (e.g. `renovaara.in`)
  3. Save → Wait up to 24 hours for propagation

### 6. Add Per-Page `metadata` Exports
Currently only the root layout has metadata. Add page-level overrides:

```ts
// src/app/upload/page.tsx
export const metadata: Metadata = {
  title: "Upload Your Selfie — Get Your AI Beauty Report",
  description:
	"Upload a clear selfie and receive your personalised AI style report in minutes. Virtual try-on, makeup, spectacles & hairstyle — all free to start.",
};
```

Pages to update:
- `src/app/upload/page.tsx`
- `src/app/auth/page.tsx` (if public-facing)
- `src/app/success/page.tsx`

### 7. Add Structured Data (JSON-LD)
Add `SoftwareApplication` and `FAQPage` schema to improve Google rich results:

```tsx
// Add inside <head> via layout.tsx or page.tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
	__html: JSON.stringify({
	  "@context": "https://schema.org",
	  "@type": "SoftwareApplication",
	  "name": "Renovaara",
	  "applicationCategory": "LifestyleApplication",
	  "operatingSystem": "Web",
	  "offers": {
		"@type": "Offer",
		"price": "9.99",
		"priceCurrency": "USD"
	  },
	  "aggregateRating": {
		"@type": "AggregateRating",
		"ratingValue": "4.9",
		"reviewCount": "50000"
	  }
	})
  }}
/>
```

- FAQ schema for the landing page FAQ section boosts SERP FAQ rich results
- Use [Google's Rich Results Test](https://search.google.com/test/rich-results) to validate

---

## 🟢 Priority 3 — Growth / Ongoing

### 8. Create a `/blog` or `/guides` Section
- Target long-tail keywords: "best hairstyle for oval face", "how to find your skin undertone", "what glasses suit heart-shaped face"
- Each post can deep-link to `/upload` as the CTA
- Use Next.js `generateStaticParams` with MDX for zero-cost static pages

### 9. Core Web Vitals Optimisation
Run [PageSpeed Insights](https://pagespeed.web.dev) on the production URL:
- **LCP (Largest Contentful Paint):** Ensure the hero section loads fast — consider adding `priority` to any above-fold `<Image>` components
- **CLS (Cumulative Layout Shift):** Reserve space for the mock report card before JS hydrates
- **INP (Interaction to Next Paint):** Lazy-load FAQ and testimonial sections with `loading="lazy"` or dynamic imports

### 10. Canonical Tags
Next.js `metadataBase` + `alternates.canonical` ensures no duplicate content penalty:

```ts
// In each page's metadata
alternates: {
  canonical: "/upload",
},
```

### 11. Sitemap — Add Dynamic Report Sharing Pages
If `/r/[token]` shared reports become public (shareable without login), add them to the sitemap:

```ts
// Fetch all public shared report tokens from Supabase
// and yield them in sitemap() for Google to index
```

### 12. International / hreflang (Future)
If expanding to non-English markets, add `alternates.languages` in metadata and corresponding `hreflang` entries in the sitemap.

---

## 📋 Checklist Summary

| Task | Priority | Status |
|---|---|---|
| `public/og-image.png` (1200×630) | 🔴 P1 | ⬜ TODO |
| `public/favicon.ico` + `apple-touch-icon.png` | 🔴 P1 | ⬜ TODO |
| `NEXT_PUBLIC_APP_URL` in Vercel | 🔴 P1 | ⬜ TODO |
| Submit sitemap to Google Search Console | 🟡 P2 | ⬜ TODO |
| Google OAuth authorised domain | 🟡 P2 | ⬜ TODO |
| Per-page metadata exports | 🟡 P2 | ✅ Done |
| JSON-LD structured data | 🟡 P2 | ✅ Done |
| `sitemap.ts` — dynamic sitemap generation | ✅ Done | ✅ |
| `robots.ts` — robots.txt | ✅ Done | ✅ |
| Root layout metadata overhaul | ✅ Done | ✅ |
| `public/site.webmanifest` | ✅ Done | ✅ |
| Blog / guides section | 🟢 P3 | ⬜ Backlog |
| Core Web Vitals audit | 🟢 P3 | ⬜ Backlog |
| Canonical tags per page | 🟢 P3 | ⬜ Backlog |
| hreflang / i18n | 🟢 P3 | ⬜ Backlog |

---

## 🔗 Useful Tools

| Tool | Purpose | Link |
|---|---|---|
| Google Search Console | Index monitoring, sitemap submission | [search.google.com/search-console](https://search.google.com/search-console) |
| PageSpeed Insights | Core Web Vitals audit | [pagespeed.web.dev](https://pagespeed.web.dev) |
| Rich Results Test | Validate structured data | [search.google.com/test/rich-results](https://search.google.com/test/rich-results) |
| Real Favicon Generator | Generate all favicon sizes | [realfavicongenerator.net](https://realfavicongenerator.net) |
| Open Graph Debugger | Preview OG card appearance | [developers.facebook.com/tools/debug](https://developers.facebook.com/tools/debug) |
| Twitter Card Validator | Preview Twitter card | [cards-dev.twitter.com/validator](https://cards-dev.twitter.com/validator) |
| Schema Markup Validator | Validate JSON-LD | [validator.schema.org](https://validator.schema.org) |

