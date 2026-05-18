import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Payment Successful — Your Report Is Unlocked",
  description:
    "Your full AI beauty report is now unlocked. Explore your colour season, face shape, skin routine, hairstyle guide, spectacles recommendations, and virtual try-on results.",
  openGraph: {
    title: "Your Renovaara Report Is Unlocked",
    description:
      "Dive into your personalised AI beauty report — colour season, skin analysis, spectacles guide, hairstyle recommendations, and virtual try-on.",
    images: ["/og-image.png"],
  },
  robots: { index: false, follow: false },
};

export default function SuccessLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
