import type { NextConfig } from "next";

const securityHeaders = [
  // Block clickjacking — no iframes from other origins
  { key: "X-Frame-Options", value: "DENY" },
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Enable DNS prefetching for performance
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Don't leak full referrer cross-origin
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Lock down unnecessary browser features
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // HSTS — Vercel sets this, but explicit is fine for clarity
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // External packages stay in Node.js (not bundled for Edge/browser)
  serverExternalPackages: ["mongoose"],

  // Suppress Turbopack/webpack mismatch warning
  turbopack: {},

  images: {
    // Accept remote images from any HTTPS host (drag-dropped images in editor)
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    formats: ["image/avif", "image/webp"],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  // Reduce build output noise in CI
  logging: {
    fetches: { fullUrl: false },
  },
};

export default nextConfig;
