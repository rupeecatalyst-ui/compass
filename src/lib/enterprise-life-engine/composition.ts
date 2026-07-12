/**
 * LIFE composition root.
 */

import type { LifePorts, PartialLifePorts } from "@/types/enterprise-life-engine-ports";
import { createInMemoryLifePorts } from "./repositories/in-memory";

let activePorts: LifePorts = createInMemoryLifePorts();

export function getLifePorts(): LifePorts {
  return activePorts;
}

export function configureLifePorts(overrides: PartialLifePorts): void {
  activePorts = { ...activePorts, ...overrides };
}

export function resetLifeComposition(): void {
  activePorts = createInMemoryLifePorts();
}
