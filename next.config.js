/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === "development";

const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://checkout.razorpay.com https://plausible.io https://*.plausible.io https://app.posthog.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://replicate.delivery https://pbxt.replicate.delivery https://*.fal.media https://fal.media https://m.media-amazon.com https://images-na.ssl-images-amazon.com https://images-eu.ssl-images-amazon.com https://ecx.images-amazon.com;
  connect-src 'self' https://*.supabase.co https://*.supabase.in https://api.openai.com wss://*.supabase.co https://api.replicate.com https://*.fal.run https://tr.a.fal.run https://api.fal.ai https://plausible.io https://*.plausible.io https://app.posthog.com https://i.posthog.com;
  frame-src https://api.razorpay.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, " ").trim();

const securityHeaders = [
  { key: "Content-Security-Policy", value: ContentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.supabase.in" },
      { protocol: "https", hostname: "replicate.delivery" },
      { protocol: "https", hostname: "pbxt.replicate.delivery" },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
  async headers() {
    return [
      {
        // Apply to all routes except static assets (they don't need CSP)
        source: "/((?!_next/static|_next/image|favicon.ico).*)",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      { source: "/reports", destination: "/dashboard", permanent: true },
      { source: "/reports/:path*", destination: "/dashboard", permanent: true },
      { source: "/studio/:path*", destination: "/upload", permanent: true },
      { source: "/analysis", destination: "/upload", permanent: true },
      { source: "/analysis/:path*", destination: "/upload", permanent: true },
      { source: "/dashboard/studio-vault", destination: "/dashboard", permanent: true },
      { source: "/dashboard/studio-vault/:path*", destination: "/dashboard", permanent: true },
      { source: "/dashboard/style-dna", destination: "/dashboard", permanent: true },
      { source: "/dashboard/style-dna/:path*", destination: "/dashboard", permanent: true },
      { source: "/dashboard/wardrobe-capsule", destination: "/dashboard", permanent: true },
      { source: "/dashboard/wardrobe-capsule/:path*", destination: "/dashboard", permanent: true },
      { source: "/dashboard/progress", destination: "/dashboard", permanent: true },
      { source: "/dashboard/vault", destination: "/vault", permanent: true },
      { source: "/report/:id/blueprint", destination: "/report/:id", permanent: true },
      { source: "/r/:token", destination: "/", permanent: true },
      { source: "/c/:token", destination: "/", permanent: true },
      { source: "/m/:token", destination: "/", permanent: true },
      { source: "/admin", destination: "/", permanent: true },
      { source: "/admin/:path*", destination: "/", permanent: true },
    ];
  },
};

module.exports = nextConfig;
