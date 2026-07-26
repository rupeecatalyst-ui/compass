/**
 * CO-ARCH-009 — Server-only Tier 2 registry wiring.
 */
import "server-only";

export { syncTier2RegistryPortsFromPrisma } from "./sync-from-prisma";
export {
  configureTier2RegistryPorts,
  getDocumentRegistryPort,
  getLenderRegistryPort,
  getProductRegistryPort,
  resetTier2RegistryPorts,
} from "./configure-ports";
