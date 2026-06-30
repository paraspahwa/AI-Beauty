import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ThemeScript } from "@/components/ThemeScript";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://renovaara.in";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Renovaara — Your AI Personal Stylist",
    template: "%s | Renovaara",
  },
  description:
    "Upload a selfie and get your full AI beauty report: face shape, skin analysis, color season, hairstyle guide, spectacles guide, and personal style direction.",
  keywords: [
    "AI personal stylist",
    "face shape analysis",
    "hairstyle recommendations",
    "spectacles guide",
    "skin analysis",
    "beauty AI",
    "style report",
  ],
  authors: [{ name: "Renovaara" }],
  creator: "Renovaara",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "Renovaara",
    title: "Renovaara — Your AI Personal Stylist",
    description:
      "Upload a selfie. Get your personalised spectacles, hairstyle, colour, skin, and style guide — all powered by AI.",
    images: [
      {
        url: "/1779024315.png",
        width: 1456,
        height: 816,
        alt: "Renovaara — AI Personal Stylist",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Renovaara — Your AI Personal Stylist",
    description:
      "Face shape, colour season, hairstyle, spectacles, skin analysis, and style guide — all from one selfie.",
    images: ["/1779024315.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Renovaara",
              "applicationCategory": "LifestyleApplication",
              "operatingSystem": "Web",
              "url": BASE_URL,
              "description": "AI-powered beauty analysis: face shape, colour season, hairstyle guide, spectacles guide, skin analysis, and personal style direction — all from one selfie.",
              "offers": [
                { "@type": "Offer", "price": "0", "priceCurrency": "INR", "description": "Free preview \u2014 face shape analysis" },
                { "@type": "Offer", "price": "399", "priceCurrency": "INR", "description": "Full AI beauty report" },
              ],
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.9",
                "reviewCount": "50000",
              },
            }),
          }}
        />
      </head>
<body className="min-h-screen flex flex-col antialiased overflow-x-hidden">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[var(--color-surface)] focus:text-ink focus:font-semibold focus:shadow-lg"
        >
          Skip to content
        </a>
        <Navbar />
        <div id="main-content" className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
