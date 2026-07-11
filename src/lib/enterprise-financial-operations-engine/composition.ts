/**
 * EFOE composition root.
 */

import type { EfoePorts, PartialEfoePorts } from "@/types/enterprise-financial-operations-engine-ports";
import { createInMemoryEfoePorts } from "./repositories/in-memory";

let activePorts: EfoePorts = createInMemoryEfoePorts();

export function getEfoePorts(): EfoePorts {
  return activePorts;
}

export function configureEfoePorts(overrides: PartialEfoePorts): void {
  activePorts = { ...activePorts, ...overrides };
}

export function resetEfoeComposition(): void {
  activePorts = createInMemoryEfoePorts();
}
