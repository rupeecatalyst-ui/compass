/**
 * EWOE composition root.
 */

import type { EwoePorts, PartialEwoePorts } from "@/types/enterprise-workflow-orchestration-engine-ports";
import { createInMemoryEwoePorts } from "./repositories/in-memory";

let activePorts: EwoePorts = createInMemoryEwoePorts();

export function getEwoePorts(): EwoePorts {
  return activePorts;
}

export function configureEwoePorts(overrides: PartialEwoePorts): void {
  activePorts = { ...activePorts, ...overrides };
}

export function resetEwoeComposition(): void {
  activePorts = createInMemoryEwoePorts();
}
