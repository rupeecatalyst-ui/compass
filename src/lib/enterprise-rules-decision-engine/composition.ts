/**
 * ERDE composition root.
 */

import type { ErdePorts, PartialErdePorts } from "@/types/enterprise-rules-decision-engine-ports";
import { createInMemoryErdePorts } from "./repositories/in-memory";

let activePorts: ErdePorts = createInMemoryErdePorts();

export function getErdePorts(): ErdePorts {
  return activePorts;
}

export function configureErdePorts(overrides: PartialErdePorts): void {
  activePorts = { ...activePorts, ...overrides };
}

export function resetErdeComposition(): void {
  activePorts = createInMemoryErdePorts();
}
