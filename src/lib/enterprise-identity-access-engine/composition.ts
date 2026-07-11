/**
 * EIAE composition root.
 */

import type { EiaePorts, PartialEiaePorts } from "@/types/enterprise-identity-access-engine-ports";
import { createInMemoryEiaePorts } from "./repositories/in-memory";

let activePorts: EiaePorts = createInMemoryEiaePorts();

export function getEiaePorts(): EiaePorts {
  return activePorts;
}

export function configureEiaePorts(overrides: PartialEiaePorts): void {
  activePorts = { ...activePorts, ...overrides };
}

export function resetEiaeComposition(): void {
  activePorts = createInMemoryEiaePorts();
}
