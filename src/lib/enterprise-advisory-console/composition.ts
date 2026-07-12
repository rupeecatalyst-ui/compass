/**
 * EAC composition root.
 */

import type { EacPorts, PartialEacPorts } from "@/types/enterprise-advisory-console-ports";
import { createInMemoryEacPorts } from "./repositories/in-memory";

let activePorts: EacPorts = createInMemoryEacPorts();

export function getEacPorts(): EacPorts {
  return activePorts;
}

export function configureEacPorts(overrides: PartialEacPorts): void {
  activePorts = { ...activePorts, ...overrides };
}

export function resetEacComposition(): void {
  activePorts = createInMemoryEacPorts();
}
