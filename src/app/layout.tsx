import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://styleai.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "StyleAI — Your AI Personal Stylist",
    template: "%s | StyleAI",
  },
  description:
    "Upload a selfie and get your full AI beauty report: virtual clothing try-on, makeup try-on, spectacles guide, hairstyle recommendations, and skin analysis — all personalised to you.",
  keywords: [
    "AI personal stylist",
    "virtual try-on",
    "makeup try-on",
    "face shape analysis",
    "hairstyle recommendations",
    "spectacles guide",
    "skin analysis",
    "beauty AI",
    "style report",
  ],
  authors: [{ name: "StyleAI" }],
  creator: "StyleAI",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "StyleAI",
    title: "StyleAI — Your AI Personal Stylist",
    description:
      "Upload a selfie. Try on clothes & makeup. Get your personalised spectacles, hairstyle & skin blueprint — all powered by AI.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "StyleAI — AI Personal Stylist",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "StyleAI — Your AI Personal Stylist",
    description:
      "Virtual try-on, makeup try-on, spectacles, hairstyle & skin analysis — all from one selfie.",
    images: ["/og-image.png"],
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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Inter:wght@400;500;600&display=swap"
        />
      </head>
      <body className="min-h-screen flex flex-col bg-obsidian text-ink antialiased">
        <Navbar />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
