/**
 * EDC composition root.
 */

import type { EdcPorts, PartialEdcPorts } from "@/types/enterprise-dialogue-center-ports";
import { createInMemoryEdcPorts } from "./repositories/in-memory";

let activePorts: EdcPorts = createInMemoryEdcPorts();

export function getEdcPorts(): EdcPorts {
  return activePorts;
}

export function configureEdcPorts(overrides: PartialEdcPorts): void {
  activePorts = { ...activePorts, ...overrides };
}

export function resetEdcComposition(): void {
  activePorts = createInMemoryEdcPorts();
}
