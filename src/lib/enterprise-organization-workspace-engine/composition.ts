/**
 * EOWE composition root.
 */

import type { EowePorts, PartialEowePorts } from "@/types/enterprise-organization-workspace-engine-ports";
import { createInMemoryEowePorts } from "./repositories/in-memory";

let activePorts: EowePorts = createInMemoryEowePorts();

export function getEowePorts(): EowePorts {
  return activePorts;
}

export function configureEowePorts(overrides: PartialEowePorts): void {
  activePorts = { ...activePorts, ...overrides };
}

export function resetEoweComposition(): void {
  activePorts = createInMemoryEowePorts();
}
