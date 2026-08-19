import type { NextConfig } from "next";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Bake demo-seed policy at build time — Pilot/Production bundles never enable demo data. */
function resolveDemoSeedsEnabledAtBuild(): "true" | "false" {
  if (process.env.ENTERPRISE_PERSISTENCE_MODE === "prisma") return "false";
  if (process.env.VERCEL === "1") return "false";
  const tier = process.env.CATALYST_DEPLOYMENT_TIER ?? process.env.NEXT_PUBLIC_CATALYST_DEPLOYMENT_TIER;
  if (tier === "pilot" || tier === "production") return "false";
  if (process.env.NODE_ENV !== "development") return "false";
  return "true";
}

function tryGit(command: string): string {
  try {
    return execSync(`git ${command}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function readPackageVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/** CO-OPS-001 — Bake build identity for Administrator Build Information panel. */
function resolveBuildIdentityEnv(): Record<string, string> {
  const version =
    process.env.NEXT_PUBLIC_APP_VERSION?.trim() || readPackageVersion();
  const buildNumber =
    process.env.NEXT_PUBLIC_BUILD_NUMBER?.trim() ||
    process.env.BUILD_NUMBER?.trim() ||
    "1";
  const commitSha =
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.NEXT_PUBLIC_GIT_COMMIT_SHA?.trim() ||
    tryGit("rev-parse HEAD");
  const branch =
    process.env.VERCEL_GIT_COMMIT_REF?.trim() ||
    process.env.NEXT_PUBLIC_GIT_BRANCH?.trim() ||
    tryGit("rev-parse --abbrev-ref HEAD");
  const commitTs =
    process.env.VERCEL_GIT_COMMIT_AUTHOR_DATE?.trim() ||
    process.env.NEXT_PUBLIC_GIT_COMMIT_TIMESTAMP?.trim() ||
    tryGit("log -1 --format=%cI");
  const buildTs =
    process.env.NEXT_PUBLIC_BUILD_TIMESTAMP?.trim() || new Date().toISOString();
  const deploymentTs =
    process.env.NEXT_PUBLIC_DEPLOYMENT_TIMESTAMP?.trim() ||
    process.env.VERCEL_DEPLOYMENT_ID?.trim() ||
    buildTs;

  let deploymentEnv = process.env.NEXT_PUBLIC_CATALYST_DEPLOYMENT_ENV?.trim();
  if (!deploymentEnv) {
    const vercelEnv = process.env.VERCEL_ENV?.trim();
    if (vercelEnv === "production") deploymentEnv = "Production";
    else if (vercelEnv === "preview" || vercelEnv === "development")
      deploymentEnv = "Preview";
    else if (process.env.VERCEL === "1") deploymentEnv = "Preview";
    else deploymentEnv = "Local";
  }

  return {
    NEXT_PUBLIC_APP_VERSION: version,
    NEXT_PUBLIC_BUILD_NUMBER: buildNumber,
    NEXT_PUBLIC_GIT_COMMIT_SHA: commitSha,
    NEXT_PUBLIC_GIT_BRANCH: branch,
    NEXT_PUBLIC_GIT_COMMIT_TIMESTAMP: commitTs,
    NEXT_PUBLIC_BUILD_TIMESTAMP: buildTs,
    NEXT_PUBLIC_DEPLOYMENT_TIMESTAMP: deploymentTs,
    NEXT_PUBLIC_CATALYST_DEPLOYMENT_ENV: deploymentEnv,
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? "",
  };
}

const demoSeedsEnabled = resolveDemoSeedsEnabledAtBuild();
const buildIdentity = resolveBuildIdentityEnv();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  /**
   * Hostinger Next.js (`app_type: next`) starts `.next/standalone/server.js`
   * after a successful `next build`. Without standalone output, Hostinger
   * reports "Deployment build failed" even when compilation succeeded
   * ("Next.js build produced no standalone server or static output").
   * Hostinger may inject this itself; declaring it here makes the contract
   * explicit if their wrapper does not merge our config.
   */
  output: "standalone",
  /** CO-DEPLOY-BAT-008 / CO-DEPLOY-LENDER-001 — Cap workers on Vercel 8GB builders to avoid OOM SIGKILL. */
  experimental: {
    cpus: 1,
    webpackMemoryOptimizations: true,
  },
  /** CO-C1-ADMIN-USER-MANUAL-001 — include Markdown knowledge base in serverless traces. */
  outputFileTracingIncludes: {
    "/admin/user-manual/**/*": ["./content/enterprise-user-manual/**/*"],
    "/admin/user-manual": ["./content/enterprise-user-manual/**/*"],
  },
  webpack: (config) => {
    config.parallelism = 1;
    return config;
  },
  /**
   * CO-WP-DEPLOY-002 — Vercel 2-core builders hang indefinitely on
   * "Linting and checking validity of types" with cpus:1. Pre-deploy
   * `tsc --noEmit` + `next lint` remain the gate; do not treat this as
   * skipping verification.
   */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ["bcryptjs", "jsonwebtoken", "@prisma/client"],
  /**
   * Do not bake ENTERPRISE_PERSISTENCE_MODE (or its NEXT_PUBLIC_ mirror) into `env`.
   * Next.js `config.env` inlines values at BUILD TIME. Hostinger often injects
   * Environment Variables only at process start; a missing/undefined value here
   * previously compiled as `"memory"`, so runtime `prisma` was ignored and APIs
   * returned PERSISTENCE_MODE_REQUIRED. Server code must read
   * process.env.ENTERPRISE_PERSISTENCE_MODE at runtime. NEXT_PUBLIC_* is inlined
   * by Next.js from the build environment when that variable is actually set.
   */
  env: {
    CATALYST_DEMO_SEEDS_ENABLED: demoSeedsEnabled,
    ...buildIdentity,
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
