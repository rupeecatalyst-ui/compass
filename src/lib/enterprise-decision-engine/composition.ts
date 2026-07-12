/**
 * EDE composition root.
 */

import type { EdePorts, PartialEdePorts } from "@/types/enterprise-decision-engine-ports";
import { createInMemoryEdePorts } from "./repositories/in-memory";

let activePorts: EdePorts = createInMemoryEdePorts();

export function getEdePorts(): EdePorts {
  return activePorts;
}

export function configureEdePorts(overrides: PartialEdePorts): void {
  activePorts = { ...activePorts, ...overrides };
}

export function resetEdeComposition(): void {
  activePorts = createInMemoryEdePorts();
}
