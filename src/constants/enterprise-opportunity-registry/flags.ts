/**
 * CO-ARCH-003 — Opportunity Registry feature flags.
 * Idle by default unless explicitly enabled, or Deal primary write is ON (Opportunity-first bridge).
 */
import { isDealRegistryPrimaryWriteEnabled } from "@/constants/enterprise-deal-registry/flags";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";

export const OPPORTUNITY_REGISTRY_API_ENABLED_ENV =
  "OPPORTUNITY_REGISTRY_API_ENABLED" as const;
export const NEXT_PUBLIC_OPPORTUNITY_REGISTRY_API_ENABLED_ENV =
  "NEXT_PUBLIC_OPPORTUNITY_REGISTRY_API_ENABLED" as const;

function envTruthy(name: string): boolean | null {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return null;
  const v = raw.trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes") return true;
  if (v === "false" || v === "0" || v === "no") return false;
  return null;
}

export function isOpportunityRegistryApiEnabled(): boolean {
  const server = envTruthy(OPPORTUNITY_REGISTRY_API_ENABLED_ENV);
  if (server === false) return false;
  const pub = envTruthy(NEXT_PUBLIC_OPPORTUNITY_REGISTRY_API_ENABLED_ENV);
  if (pub === false) return false;
  if (server === true || pub === true) return true;
  return isEnterprisePersistencePrisma() && isDealRegistryPrimaryWriteEnabled();
}

export function isOpportunityRegistryOperational(): boolean {
  return isEnterprisePersistencePrisma() && isOpportunityRegistryApiEnabled();
}
