/**
 * robots.txt — served at /robots.txt by Next.js App Router.
 *
 * Policy:
 *  - Allow Googlebot and all crawlers to index public marketing pages.
 *  - Block all crawlers from authenticated, personal, and API routes.
 */

import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://styleai.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Allow crawlers to index public pages only
        userAgent: "*",
        allow: ["/", "/upload", "/auth", "/success"],
        disallow: [
          "/report/",      // Personal beauty reports — private
          "/dashboard/",   // User dashboard — requires login
          "/admin/",       // Admin panel — must never be indexed
          "/api/",         // All API routes
          "/r/",           // Shared report token pages (optional: allow if you want public sharing indexed)
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
