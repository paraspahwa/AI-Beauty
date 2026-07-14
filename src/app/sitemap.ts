/**
 * Dynamic sitemap — served at /sitemap.xml by Next.js App Router.
 *
 * Includes all public static routes. Authenticated/report routes are
 * excluded because they require login and must not be indexed.
 *
 * For Google Search Console verification, submit:
 *   https://<your-domain>/sitemap.xml
 *
 * For Google OAuth authorised domains, add your production domain in:
 *   Google Cloud Console → APIs & Services → OAuth consent screen → Authorised domains
 */

import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://renovaara.in";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    // ── Highest priority: landing + conversion pages ─────────────────────
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/upload`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },

    // ── Blog ──────────────────────────────────────────────────────────────
    {
      url: `${BASE_URL}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/blog/what-is-my-face-shape`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },

    // ── Product Hunt launch page ─────────────────────────────────────────
    {
      url: `${BASE_URL}/producthunt`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.8,
    },

    // ── Auth ─────────────────────────────────────────────────────────────
    {
      url: `${BASE_URL}/auth`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.5,
    },

    // ── Post-payment success ──────────────────────────────────────────────
    {
      url: `${BASE_URL}/success`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },

    // ── Legal pages ───────────────────────────────────────────────────────
    {
      url: `${BASE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },

    // NOTE: /report/[id], /r/[token], /dashboard/* and /admin are
    // intentionally excluded — they require authentication and contain
    // personal data that must not be crawled.
  ];
}


