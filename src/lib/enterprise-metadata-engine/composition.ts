/**
 * EME composition root.
 */

import type { EmePorts, PartialEmePorts } from "@/types/enterprise-metadata-engine-ports";
import { createInMemoryEmePorts } from "./repositories/in-memory";

let activePorts: EmePorts = createInMemoryEmePorts();

export function getEmePorts(): EmePorts {
  return activePorts;
}

export function configureEmePorts(overrides: PartialEmePorts): void {
  activePorts = { ...activePorts, ...overrides };
}

export function resetEmeComposition(): void {
  activePorts = createInMemoryEmePorts();
}
