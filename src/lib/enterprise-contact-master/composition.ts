/**
 * ECM composition root.
 */

import type { EcmPorts, PartialEcmPorts } from "@/types/enterprise-contact-master-ports";
import { createInMemoryEcmPorts } from "./repositories/in-memory";

let activePorts: EcmPorts = createInMemoryEcmPorts();

export function getEcmPorts(): EcmPorts {
  return activePorts;
}

export function configureEcmPorts(overrides: PartialEcmPorts): void {
  activePorts = { ...activePorts, ...overrides };
}

export function resetEcmComposition(): void {
  activePorts = createInMemoryEcmPorts();
}
