/**
 * CO-HOTFIX-005/006 — delegates to enterprise-registry SSOT.
 */

export {
  ensureEnterpriseRegistryHydrated as ensureEcmHydrated,
  resetEnterpriseRegistryHydration as resetEcmHydrationCache,
} from "@/lib/enterprise-registry/hydrate";
