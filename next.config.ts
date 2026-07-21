import type { NextConfig } from "next";

/** Bake demo-seed policy at build time — Pilot/Production bundles never enable demo data. */
function resolveDemoSeedsEnabledAtBuild(): "true" | "false" {
  if (process.env.ENTERPRISE_PERSISTENCE_MODE === "prisma") return "false";
  if (process.env.VERCEL === "1") return "false";
  const tier = process.env.CATALYST_DEPLOYMENT_TIER ?? process.env.NEXT_PUBLIC_CATALYST_DEPLOYMENT_TIER;
  if (tier === "pilot" || tier === "production") return "false";
  if (process.env.NODE_ENV !== "development") return "false";
  return "true";
}

const demoSeedsEnabled = resolveDemoSeedsEnabledAtBuild();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["bcryptjs", "jsonwebtoken", "@prisma/client"],
  env: {
    CATALYST_DEMO_SEEDS_ENABLED: demoSeedsEnabled,
    ENTERPRISE_PERSISTENCE_MODE: process.env.ENTERPRISE_PERSISTENCE_MODE ?? "memory",
    NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE: process.env.ENTERPRISE_PERSISTENCE_MODE ?? "memory",
  },
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
