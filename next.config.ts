import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["bcryptjs", "jsonwebtoken", "@prisma/client"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async rewrites() {
    // ADR-014: App Router handlers under src/app/api/auth/* take precedence over rewrites.
    // Proxy remaining /api/* only when NEXT_PUBLIC_API_URL is explicitly set.
    // Empty = App Router / same-origin only (Vercel-safe; no localhost rewrite).
    const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
    if (!apiUrl) {
      return [];
    }
    const base = apiUrl.replace(/\/$/, "");
    return [
      {
        source: "/api/:path*",
        destination: `${base}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
