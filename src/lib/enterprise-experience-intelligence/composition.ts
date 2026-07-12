/**
 * EEI composition root.
 */

import type { EeiPorts, PartialEeiPorts } from "@/types/enterprise-experience-intelligence-ports";
import { createInMemoryEeiPorts } from "./repositories/in-memory";

let activePorts: EeiPorts = createInMemoryEeiPorts();

export function getEeiPorts(): EeiPorts {
  return activePorts;
}

export function configureEeiPorts(overrides: PartialEeiPorts): void {
  activePorts = { ...activePorts, ...overrides };
}

export function resetEeiComposition(): void {
  activePorts = createInMemoryEeiPorts();
}
