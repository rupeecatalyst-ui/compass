/**
 * EPNE composition root.
 */

import type { EpnePorts, PartialEpnePorts } from "@/types/enterprise-partner-network-engine-ports";
import { createInMemoryEpnePorts } from "./repositories/in-memory";

let activePorts: EpnePorts = createInMemoryEpnePorts();

export function getEpnePorts(): EpnePorts {
  return activePorts;
}

export function configureEpnePorts(overrides: PartialEpnePorts): void {
  activePorts = { ...activePorts, ...overrides };
}

export function resetEpneComposition(): void {
  activePorts = createInMemoryEpnePorts();
}
