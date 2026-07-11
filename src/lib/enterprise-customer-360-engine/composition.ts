/**
 * EC360 composition root.
 */

import type { Ec360Ports, PartialEc360Ports } from "@/types/enterprise-customer-360-engine-ports";
import { createInMemoryEc360Ports } from "./repositories/in-memory";

let activePorts: Ec360Ports = createInMemoryEc360Ports();

export function getEc360Ports(): Ec360Ports {
  return activePorts;
}

export function configureEc360Ports(overrides: PartialEc360Ports): void {
  activePorts = { ...activePorts, ...overrides };
}

export function resetEc360Composition(): void {
  activePorts = createInMemoryEc360Ports();
}
