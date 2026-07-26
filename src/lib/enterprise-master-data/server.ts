/**
 * CO-ARCH-009 — Server-only Enterprise Master Data wiring.
 */
import "server-only";

export { syncReferenceMasterPortsFromPrisma } from "./sync-from-prisma";
export {
  configureReferenceMasterPorts,
  getReferenceMasterPort,
  resetReferenceMasterPorts,
} from "./configure-ports";
