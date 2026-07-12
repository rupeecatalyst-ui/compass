/**
 * ENCE composition root.
 */

import type { EncePorts, PartialEncePorts } from "@/types/enterprise-notification-communication-engine-ports";
import { createInMemoryEncePorts } from "./repositories/in-memory";

let activePorts: EncePorts = createInMemoryEncePorts();

export function getEncePorts(): EncePorts {
  return activePorts;
}

export function configureEncePorts(overrides: PartialEncePorts): void {
  activePorts = { ...activePorts, ...overrides };
}

export function resetEnceComposition(): void {
  activePorts = createInMemoryEncePorts();
}
