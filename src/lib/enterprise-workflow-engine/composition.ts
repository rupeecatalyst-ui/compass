/**
 * EWE composition root.
 */

import type { EwePorts, PartialEwePorts } from "@/types/enterprise-workflow-engine-ports";
import { createInMemoryEwePorts } from "./repositories/in-memory";

let activePorts: EwePorts = createInMemoryEwePorts();

export function getEwePorts(): EwePorts {
  return activePorts;
}

export function configureEwePorts(overrides: PartialEwePorts): void {
  activePorts = { ...activePorts, ...overrides };
}

export function resetEweComposition(): void {
  activePorts = createInMemoryEwePorts();
}
