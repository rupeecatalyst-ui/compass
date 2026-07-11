/**
 * EDIE composition root.
 */

import type { EdiePorts, PartialEdiePorts } from "@/types/enterprise-document-intelligence-engine-ports";
import { createInMemoryEdiePorts } from "./repositories/in-memory";

let activePorts: EdiePorts = createInMemoryEdiePorts();

export function getEdiePorts(): EdiePorts {
  return activePorts;
}

export function configureEdiePorts(overrides: PartialEdiePorts): void {
  activePorts = { ...activePorts, ...overrides };
}

export function resetEdieComposition(): void {
  activePorts = createInMemoryEdiePorts();
}
