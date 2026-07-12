/**
 * ECG composition root.
 */

import type { EcgPorts, PartialEcgPorts } from "@/types/enterprise-interface-configuration-grants-ports";
import { createInMemoryEcgPorts } from "./repositories/in-memory";

let activePorts: EcgPorts = createInMemoryEcgPorts();

export function getEcgPorts(): EcgPorts {
  return activePorts;
}

export function configureEcgPorts(overrides: PartialEcgPorts): void {
  activePorts = { ...activePorts, ...overrides };
}

export function resetEcgComposition(): void {
  activePorts = createInMemoryEcgPorts();
}
