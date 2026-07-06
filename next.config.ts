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
    // Remaining /api/* routes proxy to the legacy Express API during local development.
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:4000";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
