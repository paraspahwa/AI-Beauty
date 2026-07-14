import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Beauty Blog | Renovaara",
  description:
    "Learn about face shapes, colour seasons, skin analysis, and AI beauty technology. Expert guides to discover your personal style.",
};

const POSTS = [
  {
    slug: "what-is-my-face-shape",
    title: "What Is My Face Shape? A Complete Guide to 8 Types",
    excerpt:
      "Learn how to identify your face shape using AI analysis. Oval, round, square, heart, diamond, oblong, triangle, and soft oval — discover yours.",
    category: "Face Shape",
    date: "2026-07-10",
  },
  {
    slug: "12-season-color-analysis-guide",
    title: "The Complete 12-Season Colour Analysis Guide",
    excerpt:
      "Spring, summer, autumn, or winter? Discover the 12-season system and how AI can identify your exact seasonal palette for clothing and makeup.",
    category: "Color Analysis",
    date: "2026-07-08",
  },
  {
    slug: "best-glasses-for-your-face-shape",
    title: "Best Glasses for Your Face Shape — AI-Recommended Frames",
    excerpt:
      "Find the perfect spectacles for your face. AI analysis recommends frame shapes, colours, and fits that complement your unique features.",
    category: "Spectacles",
    date: "2026-07-05",
  },
  {
    slug: "ai-skin-analysis-routine",
    title: "AI Skin Analysis: Build Your Perfect AM/PM Routine",
    excerpt:
      "How AI analyzes your skin type, concerns, and zones to create a personalized skincare routine. No guesses, just science-backed recommendations.",
    category: "Skin Care",
    date: "2026-07-01",
  },
  {
    slug: "hairstyles-for-oval-face",
    title: "10 Best Hairstyles for Oval Face Shapes",
    excerpt:
      "Oval faces can pull off almost any cut. Here are the top 10 hairstyles AI recommends to enhance your oval features, from pixies to long layers.",
    category: "Hairstyle",
    date: "2026-06-28",
  },
  {
    slug: "what-season-am-i-color-analysis",
    title: "What Season Am I? Your AI Colour Season Quiz",
    excerpt:
      "Take the AI colour season test. Upload a selfie and discover whether you're a Deep Winter, Soft Autumn, Bright Spring, or Light Summer.",
    category: "Color Analysis",
    date: "2026-06-25",
  },
];

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-[var(--color-background)]">
      <div className="page-bleed-x py-14 sm:py-20">
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-10 text-center">
            <p className="foil-label mb-3 justify-center">Renovaara Blog</p>
            <h1 className="font-display text-3xl text-ink sm:text-4xl">
              Beauty Intelligence
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-ink-stone">
              Guides and insights to help you understand your face shape, colour season, and personal style — powered by AI.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {POSTS.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group rounded-2xl border border-terracotta/10 bg-[var(--color-surface)] p-6 transition hover:border-terracotta/25"
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded-full border border-terracotta/20 bg-terracotta/10 px-2.5 py-0.5 text-[11px] font-medium text-terracotta">
                    {post.category}
                  </span>
                  <span className="text-[11px] text-ink-mist">{post.date}</span>
                </div>
                <h2 className="font-display text-lg text-ink transition group-hover:text-terracotta">
                  {post.title}
                </h2>
                <p className="mt-2 text-sm text-ink-stone line-clamp-3">{post.excerpt}</p>
              </Link>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-terracotta/20 bg-terracotta/10 px-6 py-3 text-sm font-semibold text-terracotta"
            >
              ← Back to Renovaara
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
