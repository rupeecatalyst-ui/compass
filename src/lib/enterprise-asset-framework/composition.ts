/**
 * EAF composition root — single injection point for all adapters.
 *
 * Sprint 1: in-memory repositories + in-process events.
 * Sprint 2+: configureEafPorts({ assets: prismaAssetRepository, ... })
 */

import type { EafPorts, PartialEafPorts } from "@/types/enterprise-asset-framework-ports";
import type { EafEventPublisher } from "@/types/enterprise-asset-framework-events";
import { resetEafExtensionRegistry } from "./extension-registry";
import { createInProcessEafEventPublisher } from "./events/in-process-event-publisher";
import { createInMemoryEafPorts } from "./repositories/in-memory";

let activePorts: EafPorts = createInMemoryEafPorts();
let activeEventPublisher: EafEventPublisher = createInProcessEafEventPublisher();

export function getEafPorts(): EafPorts {
  return activePorts;
}

export function getEafEventPublisher(): EafEventPublisher {
  return activeEventPublisher;
}

/**
 * Partial override — unprovided ports retain current implementation.
 * Use for incremental migration (e.g. swap audit first, then assets).
 */
export function configureEafPorts(overrides: PartialEafPorts): void {
  activePorts = { ...activePorts, ...overrides };
}

export function configureEafEventPublisher(publisher: EafEventPublisher): void {
  activeEventPublisher = publisher;
}

/** Reset to Sprint 1 defaults — tests and local development. */
export function resetEafComposition(): void {
  activePorts = createInMemoryEafPorts();
  activeEventPublisher = createInProcessEafEventPublisher();
  activeEventPublisher.clearListeners();
  resetEafExtensionRegistry();
}
