/**
 * Demo seed environment policy — business demo data is local development only.
 *
 * Disabled when:
 * - ENTERPRISE_PERSISTENCE_MODE=prisma (pilot / production persistence)
 * - Deployed on Vercel (Pilot or Production)
 * - CATALYST_DEPLOYMENT_TIER=pilot|production
 * - NODE_ENV !== development (production builds, including local `next start`)
 *
 * Build-time: next.config.ts sets CATALYST_DEMO_SEEDS_ENABLED so Pilot/Production
 * bundles never include enabled demo seeds.
 */

import {
  isEnterprisePersistencePrisma,
  type EnterprisePersistenceMode,
} from "@/constants/enterprise-persistence";

export const DEMO_SEED_DEVELOPMENT_ONLY_LABEL = "Development Only — Demo Data";

export type CatalystDeploymentTier = "local" | "pilot" | "production";

function readEnv(key: string): string | undefined {
  if (typeof process === "undefined") return undefined;
  return process.env[key]?.trim() || undefined;
}

export { isEnterprisePersistencePrisma, type EnterprisePersistenceMode };

/** Resolved deployment tier for logging / diagnostics. */
export function resolveCatalystDeploymentTier(): CatalystDeploymentTier {
  const explicit =
    readEnv("CATALYST_DEPLOYMENT_TIER") ?? readEnv("NEXT_PUBLIC_CATALYST_DEPLOYMENT_TIER");
  if (explicit === "pilot") return "pilot";
  if (explicit === "production") return "production";

  if (readEnv("VERCEL") === "1") {
    const vercelEnv = readEnv("VERCEL_ENV");
    return vercelEnv === "production" ? "production" : "pilot";
  }

  return "local";
}

function isPilotOrProductionDeployment(): boolean {
  const tier = resolveCatalystDeploymentTier();
  return tier === "pilot" || tier === "production";
}

/**
 * Whether in-memory demo business seeds may run (local `next dev` only).
 * Baked at build time via CATALYST_DEMO_SEEDS_ENABLED on Vercel / production builds.
 */
export function isDemoSeedEnabled(): boolean {
  const baked = readEnv("CATALYST_DEMO_SEEDS_ENABLED");
  if (baked === "true") return true;
  if (baked === "false") return false;

  if (isEnterprisePersistencePrisma()) return false;
  if (isPilotOrProductionDeployment()) return false;
  if (readEnv("NODE_ENV") !== "development") return false;
  return true;
}

/** Run demo seed logic only when permitted by environment policy. */
export function runDemoSeedIfEnabled(fn: () => void): void {
  if (!isDemoSeedEnabled()) return;
  fn();
}

/** Numeric variant for seeds that return a count. */
export function runDemoSeedIfEnabledWithResult<T>(fn: () => T, fallback: T): T {
  if (!isDemoSeedEnabled()) return fallback;
  return fn();
}
