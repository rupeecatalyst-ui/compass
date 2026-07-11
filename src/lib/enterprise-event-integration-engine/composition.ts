/**
 * EEIE composition root.
 */

import type { EeiePorts, PartialEeiePorts } from "@/types/enterprise-event-integration-engine-ports";
import { createInMemoryEeiePorts } from "./repositories/in-memory";

let activePorts: EeiePorts = createInMemoryEeiePorts();

export function getEeiePorts(): EeiePorts {
  return activePorts;
}

export function configureEeiePorts(overrides: PartialEeiePorts): void {
  activePorts = { ...activePorts, ...overrides };
}

export function resetEeieComposition(): void {
  activePorts = createInMemoryEeiePorts();
}
