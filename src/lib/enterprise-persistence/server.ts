/**
 * CO-ARCH-009 — Server-only Enterprise Persistence wiring.
 *
 * Import from API routes / server modules only.
 * Never import this entry from Client Components.
 */

import "server-only";

export {
  configureEcmPersistencePorts,
  configureEcmPersistencePorts as configureEcmPortsForPrisma,
  isEcmPrismaPersistenceActive,
  syncEcmPortsFromPrisma,
} from "./configure-ports";
