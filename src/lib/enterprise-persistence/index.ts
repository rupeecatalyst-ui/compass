/**
 * CO-ARCH-009 — Client-safe Enterprise Persistence barrel.
 *
 * Safe for Client Components / browser bundles:
 * - constants & mode helpers
 * - REST API client
 * - client persistence helpers (hydrate / persist via API)
 *
 * Server-only wiring (configure-ports, Prisma, repositories) lives in:
 *   `@/lib/enterprise-persistence/server`
 */

export {
  CATALYST_ONE_SUPABASE_PROJECT_ID,
  CATALYST_ONE_SUPABASE_URL,
  CO_SPRINT_117_CERTIFICATION_GATES,
  ENTERPRISE_PERSISTENCE_MODE_ENV,
  ENTERPRISE_PERSISTENCE_ORG_SLUG,
  FORBIDDEN_CATALYST_ONE_SUPABASE_PROJECT_IDS,
  isEnterprisePersistencePrisma,
  resolveEnterprisePersistenceMode,
  type CoSprint117CertificationGate,
  type EnterprisePersistenceMode,
} from "@/constants/enterprise-persistence";

export { ecmApiClient } from "./ecm-api-client";

export {
  hydrateEcmFromPrisma,
  persistLinkCompanyContact,
  persistRegisterEcmCompany,
  persistRegisterEcmContact,
  persistUpdateEcmCompany,
  persistUpdateEcmContact,
} from "./ecm-persist";
