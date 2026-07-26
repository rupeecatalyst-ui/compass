/**
 * CO-ARCH-001-I5a — Reference Master dual-read transition flags.
 */
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";

export const ENTERPRISE_MASTERS_DUAL_READ_ENV = "ENTERPRISE_MASTERS_DUAL_READ" as const;
export const NEXT_PUBLIC_ENTERPRISE_MASTERS_DUAL_READ_ENV =
  "NEXT_PUBLIC_ENTERPRISE_MASTERS_DUAL_READ" as const;

/** When true, ports merge PostgreSQL reference masters with legacy constants (constants win on code clash). */
export function isEnterpriseMastersDualReadEnabled(): boolean {
  if (!isEnterprisePersistencePrisma()) return false;
  const raw =
    process.env[NEXT_PUBLIC_ENTERPRISE_MASTERS_DUAL_READ_ENV] ??
    process.env[ENTERPRISE_MASTERS_DUAL_READ_ENV];
  if (raw === "false" || raw === "0") return false;
  return true;
}

/** I6 will flip this to use port output as runtime SSOT. Remains false in I5a. */
export function isReferenceMasterPortRuntimeActive(): boolean {
  const raw =
    process.env.NEXT_PUBLIC_REFERENCE_MASTER_PORT_RUNTIME ??
    process.env.REFERENCE_MASTER_PORT_RUNTIME;
  return raw === "true" || raw === "1";
}

export const TIER2_REGISTRY_PORT_RUNTIME_ENV = "TIER2_REGISTRY_PORT_RUNTIME" as const;
export const NEXT_PUBLIC_TIER2_REGISTRY_PORT_RUNTIME_ENV =
  "NEXT_PUBLIC_TIER2_REGISTRY_PORT_RUNTIME" as const;

/** I6b — Tier 2 picker port swap. Default OFF (constants remain SSOT until explicitly enabled). */
export function isTier2RegistryPortRuntimeActive(): boolean {
  const raw =
    process.env[NEXT_PUBLIC_TIER2_REGISTRY_PORT_RUNTIME_ENV] ??
    process.env[TIER2_REGISTRY_PORT_RUNTIME_ENV];
  return raw === "true" || raw === "1";
}
