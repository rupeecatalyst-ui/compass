/**
 * CO-LEND-001 — Browser-safe barrel (no node:crypto).
 * Server OTP/token helpers: `@/lib/lender-program-portal/security` (server-only).
 */
export { compareProgramPayloads } from "@/lib/lender-program-portal/compare";
export {
  lenderProgramPortalClient,
  lenderProgramPortalPublicClient,
} from "@/lib/lender-program-portal/client";
