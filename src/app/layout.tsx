import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StyleAI — Your AI Personal Stylist",
  description:
    "Upload a selfie and unlock a personalized beauty report: face shape, color season, skin care, glasses, and hairstyle recommendations.",
  openGraph: {
    title: "StyleAI",
    description: "Your AI Personal Stylist — discover the styles that flatter you.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Inter:wght@400;500;600&display=swap"
        />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
