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
        {/* ── Persistent aurora background ── */}
        <div
          aria-hidden="true"
          className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
        >
          {/* Primary terracotta orb — top-right */}
          <div
            className="absolute -top-48 -right-48 w-[700px] h-[700px] rounded-full opacity-[0.18] animate-aurora"
            style={{
              background: "radial-gradient(circle at 40% 40%, #C9956B 0%, #E8C990 35%, transparent 70%)",
            }}
          />
          {/* Iris / violet orb — mid-left */}
          <div
            className="absolute top-1/3 -left-56 w-[520px] h-[520px] rounded-full opacity-[0.14] animate-float-slow"
            style={{
              background: "radial-gradient(circle at 60% 60%, #7B6E9E 0%, #5A5075 45%, transparent 75%)",
            }}
          />
          {/* Camel orb — bottom-center */}
          <div
            className="absolute -bottom-32 left-1/3 w-[450px] h-[450px] rounded-full opacity-[0.12] animate-glow-breathe"
            style={{
              background: "radial-gradient(circle at 50% 30%, #E8C990 0%, #C9956B 40%, transparent 70%)",
            }}
          />
          {/* Silver orb — bottom-right */}
          <div
            className="absolute bottom-0 -right-20 w-[300px] h-[300px] rounded-full opacity-[0.09]"
            style={{
              background: "radial-gradient(circle, #B8C4CC 0%, transparent 70%)",
              animation: "float-slow 13s ease-in-out infinite reverse",
            }}
          />
          {/* Subtle grid mesh */}
          <div
            className="absolute inset-0 opacity-[0.022]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
              backgroundSize: "72px 72px",
            }}
          />
        </div>

        <Navbar />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
