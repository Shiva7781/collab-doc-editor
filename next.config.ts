import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 16: external packages for server components
  serverExternalPackages: ["mongoose"],
  // Empty turbopack config silences the Turbopack/webpack mismatch warning
  turbopack: {},
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
