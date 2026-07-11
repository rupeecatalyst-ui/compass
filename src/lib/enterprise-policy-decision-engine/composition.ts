/**
 * EPDE composition root.
 */

import type { EpdePorts, PartialEpdePorts } from "@/types/enterprise-policy-decision-engine-ports";
import { createInMemoryEpdePorts } from "./repositories/in-memory";

let activePorts: EpdePorts = createInMemoryEpdePorts();

export function getEpdePorts(): EpdePorts {
  return activePorts;
}

export function configureEpdePorts(overrides: PartialEpdePorts): void {
  activePorts = { ...activePorts, ...overrides };
}

export function resetEpdeComposition(): void {
  activePorts = createInMemoryEpdePorts();
}
