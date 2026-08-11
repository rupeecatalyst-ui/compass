/**
 * EAI composition root — configure ports without coupling to a vendor LLM.
 */

import type { EaiPorts, PartialEaiPorts } from "@/types/enterprise-ai-platform-ports";
import { createInMemoryEaiPorts } from "./repositories/in-memory";

let activePorts: EaiPorts = createInMemoryEaiPorts();

export function getEaiPorts(): EaiPorts {
  return activePorts;
}

export function configureEaiPorts(overrides: PartialEaiPorts): void {
  activePorts = { ...activePorts, ...overrides };
}

export function resetEaiComposition(): void {
  activePorts = createInMemoryEaiPorts();
}
