/**
 * CO-ARCH-009 — Client-safe Tier 2 registry barrel.
 * Server sync: `@/lib/enterprise-tier2-ports/server`
 */
export {
  configureTier2RegistryPorts,
  getDocumentRegistryPort,
  getLenderRegistryPort,
  getProductRegistryPort,
  resetTier2RegistryPorts,
} from "./configure-ports";

export { tier2RegistryApiClient } from "./api-client";
export {
  ensureTier2RegistryPortsHydrated,
  resetTier2RegistryHydration,
} from "./hydrate-client";

export { constantsProductRegistryPort } from "./ports/product-constants-port";
export { constantsDocumentRegistryPort } from "./ports/document-constants-port";
export { constantsLenderRegistryPort } from "./ports/lender-constants-port";
