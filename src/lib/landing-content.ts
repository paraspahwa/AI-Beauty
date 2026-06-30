import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Droplets,
  Glasses,
  Palette,
  Paintbrush,
  Scissors,
  Sparkles,
} from "lucide-react";
import type { FAQItem } from "@/components/home/FAQAccordion";
import { PRODUCT_COPY } from "@/lib/product-copy";
import { fmtInr } from "@/lib/landing-pricing";
import { publicEnv } from "@/lib/public-env";

export interface LandingFeature {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface LandingStep {
  title: string;
  description: string;
}

export const LANDING_FEATURES: LandingFeature[] = [
  {
    icon: Sparkles,
    title: "Face Features Infographic",
    description:
      "Free face-shape preview, then a full infographic mapping eyes, brows, nose, cheeks, and lips to tailored styling advice.",
  },
  {
    icon: Palette,
    title: "Colour Season Infographic",
    description:
      "Your personal palette — best clothing, makeup, and metal tones for your undertone, plus shades to avoid.",
  },
  {
    icon: Droplets,
    title: "Skin Analysis Infographic",
    description:
      "Skin type and concern-based AM/PM routine guidance in a polished, shareable analysis graphic.",
  },
  {
    icon: Scissors,
    title: "Hairstyle Guide Infographic",
    description:
      "Cuts, lengths, and styling direction matched to your face shape — designed as a luxury reference card.",
  },
  {
    icon: Glasses,
    title: "Spectacles Guide Infographic",
    description:
      "Frame shape, material, and colour recommendations with try-on panels matched to your features.",
  },
  {
    icon: Paintbrush,
    title: "Hair Colour Infographic",
    description:
      "Flattering shade directions and placement ideas — warm, cool, and neutral options for your complexion.",
  },
  {
    icon: BookOpen,
    title: "Style Guide Add-on",
    description:
      `Optional ${fmtInr(publicEnv.razorpay.styleGuidePriceINR)} upgrade after unlock — wardrobe infographic and PDF from a full-body photo.`,
  },
];

export const LANDING_STEPS: LandingStep[] = [
  {
    title: "Upload a selfie",
    description:
      "Use natural light and a clear front-facing photo. No payment or card required to start.",
  },
  {
    title: "Preview your face shape",
    description:
      "See your free face-shape infographic and a teaser of your Full Report before you decide to unlock.",
  },
  {
    title: "Unlock six infographics",
    description: `One-time ${fmtInr(publicEnv.razorpay.priceINR)} payment unlocks all six analysis infographics plus a downloadable PDF.`,
  },
  {
    title: "Add Style Guide (optional)",
    description: `Upload a full-body photo anytime after unlock for a separate ${fmtInr(publicEnv.razorpay.styleGuidePriceINR)} wardrobe infographic and PDF.`,
  },
  {
    title: "Keep it forever",
    description:
      "Download your PDFs and revisit every infographic from your dashboard and vault — no subscription.",
  },
];

const INFOGRAPHIC_LIST = PRODUCT_COPY.report.items
  .filter((item) => item.includes("infographic"))
  .map((item) => item.replace(/ infographic$/i, ""))
  .join(", ");

export function getLandingFaqs(): FAQItem[] {
  const reportPrice = fmtInr(publicEnv.razorpay.priceINR);
  const styleGuidePrice = fmtInr(publicEnv.razorpay.styleGuidePriceINR);

  return [
    {
      id: "free-preview",
      question: "What is included in the free preview?",
      answer: `${PRODUCT_COPY.free.items.join(". ")}. Unlock the Full Report (${reportPrice}) for six analysis infographics — ${INFOGRAPHIC_LIST} — plus a downloadable analysis PDF.`,
    },
    {
      id: "six-infographics",
      question: "What are the six infographics?",
      answer: `Your Full Report includes: ${PRODUCT_COPY.report.items.join("; ")}.`,
    },
    {
      id: "style-guide",
      question: "Is the Style Guide included in the Full Report?",
      answer: `No. The Style Guide is an optional add-on (${styleGuidePrice}) purchased separately after you unlock your Full Report. Upload a full-body photo to receive a wardrobe infographic and a separate style guide PDF — silhouettes, essentials, and accent colours matched to your season.`,
    },
    {
      id: "payment",
      question: "Is it a subscription?",
      answer:
        "No. Renovaara uses one-time payments only — one fee per Full Report unlock, and an optional one-time fee for the Style Guide add-on. Pay once per analysis and keep that report forever.",
    },
    {
      id: "pdf",
      question: "Can I download my report?",
      answer:
        "Yes. The Full Report includes a downloadable analysis PDF covering your unlocked infographics. The Style Guide add-on includes its own separate PDF when purchased.",
    },
    {
      id: "accuracy",
      question: "How accurate is the analysis?",
      answer:
        "Results are strongest with a clear front-facing selfie in balanced light. For the Style Guide add-on, use a full-body photo in fitted clothing. The system evaluates multiple visual traits to produce personalised recommendations — advisory guidance, not medical advice.",
    },
    {
      id: "privacy",
      question: "Is my photo private?",
      answer:
        "Yes. Selfies and full-body photos are stored in your private account, processed securely, and never sold. You can delete your report and images from your dashboard at any time.",
    },
    {
      id: "refunds",
      question: "What is your refund policy?",
      answer:
        "Because reports are generated and delivered digitally, payments are final once delivery succeeds. If a technical failure prevents delivery, contact support@renovaara.in and we will investigate.",
    },
  ];
}
