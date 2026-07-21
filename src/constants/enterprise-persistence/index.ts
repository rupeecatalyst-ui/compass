/**
 * CO-SPRINT-117 — Enterprise Persistence (Phase 1B) constants.
 *
 * Approved decisions (FINAL):
 * - Object Storage: Supabase Storage (docs CO-SPRINT-121)
 * - Loan files: Hybrid Relational + JSONB v1 (CO-SPRINT-118+)
 * - EOLE: Phase 2A only — not in CO-SPRINT-117
 * - Organization: Single organization pilot
 * - API: REST route handlers
 * - Stack: UI → API → Service → Repository → Prisma → PostgreSQL
 */

/**
 * Canonical Supabase project for Catalyst One Pilot (verified live SSOT).
 * Project: Catalyst One Platform
 */
export const CATALYST_ONE_SUPABASE_PROJECT_ID = "unpjfzvlokovobxgvazo" as const;
export const CATALYST_ONE_SUPABASE_URL =
  `https://${CATALYST_ONE_SUPABASE_PROJECT_ID}.supabase.co` as const;

/**
 * Historical / replaced projects — not for Catalyst One persistence.
 * - swbrjrrapwdtgkpdbphe: original scaffold
 * - lspghyjozleqovrtdxqe: former RCLIP Production interim target
 */
export const FORBIDDEN_CATALYST_ONE_SUPABASE_PROJECT_IDS = [
  "swbrjrrapwdtgkpdbphe",
  "lspghyjozleqovrtdxqe",
] as const;

/** Pilot organization slug — seeded on first migrate + seed. */
export const ENTERPRISE_PERSISTENCE_ORG_SLUG = "rupee-catalyst" as const;

/** Env flag: when true, domain APIs use PostgreSQL repositories (not in-memory). */
export const ENTERPRISE_PERSISTENCE_MODE_ENV = "ENTERPRISE_PERSISTENCE_MODE" as const;

/**
 * Demo business seeds (contacts, loan files, tasks, etc.) are gated by
 * `src/lib/demo-seed/environment.ts` — disabled when mode=prisma or deployed Pilot/Production.
 */

export type EnterprisePersistenceMode = "memory" | "prisma";

export function resolveEnterprisePersistenceMode(): EnterprisePersistenceMode {
  // Next.js only inlines literal `process.env.FOO` in client bundles — not dynamic keys.
  const raw =
    process.env.NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE ??
    process.env.ENTERPRISE_PERSISTENCE_MODE;
  return raw === "prisma" ? "prisma" : "memory";
}

export function isEnterprisePersistencePrisma(): boolean {
  return resolveEnterprisePersistenceMode() === "prisma";
}

/** CO-SPRINT-117 certification gate ids — must pass before CO-SPRINT-118. */
export const CO_SPRINT_117_CERTIFICATION_GATES = [
  "business",
  "technical",
  "data_integrity",
  "performance",
] as const;

export type CoSprint117CertificationGate = (typeof CO_SPRINT_117_CERTIFICATION_GATES)[number];
