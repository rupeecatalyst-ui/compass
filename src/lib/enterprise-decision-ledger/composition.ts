/**
 * EDL composition root.
 */

import type { EdlPorts, PartialEdlPorts } from "@/types/enterprise-decision-ledger-ports";
import { createInMemoryEdlPorts } from "./repositories/in-memory";

let activePorts: EdlPorts = createInMemoryEdlPorts();

export function getEdlPorts(): EdlPorts {
  return activePorts;
}

export function configureEdlPorts(overrides: PartialEdlPorts): void {
  activePorts = { ...activePorts, ...overrides };
}

export function resetEdlComposition(): void {
  activePorts = createInMemoryEdlPorts();
}
