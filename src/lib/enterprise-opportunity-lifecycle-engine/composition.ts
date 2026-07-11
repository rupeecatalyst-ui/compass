/**
 * EOLE composition root.
 */

import type { EolePorts, PartialEolePorts } from "@/types/enterprise-opportunity-lifecycle-engine-ports";
import { createInMemoryEolePorts } from "./repositories/in-memory";

let activePorts: EolePorts = createInMemoryEolePorts();

export function getEolePorts(): EolePorts {
  return activePorts;
}

export function configureEolePorts(overrides: PartialEolePorts): void {
  activePorts = { ...activePorts, ...overrides };
}

export function resetEoleComposition(): void {
  activePorts = createInMemoryEolePorts();
}
