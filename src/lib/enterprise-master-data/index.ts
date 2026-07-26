/**
 * CO-ARCH-009 — Client-safe Enterprise Master Data barrel.
 * Server sync: `@/lib/enterprise-master-data/server`
 */
export {
  configureReferenceMasterPorts,
  getReferenceMasterPort,
  isEnterpriseMastersDualReadEnabled,
  isReferenceMasterPortRuntimeActive,
  resetReferenceMasterPorts,
} from "./configure-ports";

export { referenceMasterApiClient } from "./reference-master-api-client";
export { referenceDomainToEcmDomain } from "./domain-map";
export {
  ecmDomainToReferenceDomain,
  isTier1EcmMasterDomain,
  TIER1_ECM_MASTER_DOMAINS,
} from "./ecm-domain-map";
export {
  ensureReferenceMasterPortsHydrated,
  resetReferenceMasterHydration,
} from "./hydrate-client";
