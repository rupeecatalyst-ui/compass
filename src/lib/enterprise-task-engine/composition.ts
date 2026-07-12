/**
 * ETE composition root.
 */

import type { EtePorts, PartialEtePorts } from "@/types/enterprise-task-engine-ports";
import { createInMemoryEtePorts } from "./repositories/in-memory";

let activePorts: EtePorts = createInMemoryEtePorts();

export function getEtePorts(): EtePorts {
  return activePorts;
}

export function configureEtePorts(overrides: PartialEtePorts): void {
  activePorts = { ...activePorts, ...overrides };
}

export function resetEteComposition(): void {
  activePorts = createInMemoryEtePorts();
}
