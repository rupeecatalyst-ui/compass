/**
 * EWOE registry snapshot.
 */

import { EWOE_FRAMEWORK_VERSION } from "@/constants/enterprise-workflow-orchestration-engine";
import type { EwoeRegistrySnapshot } from "@/types/enterprise-workflow-orchestration-engine";
import { getEwoePorts } from "./composition";

export function getEwoeFrameworkVersion(): string {
  return EWOE_FRAMEWORK_VERSION;
}

export function getEwoeRegistrySnapshot(): EwoeRegistrySnapshot {
  const ports = getEwoePorts();
  return {
    definitions: ports.definitions.list(),
    instances: ports.instances.list(),
    transitions: ports.transitions.list(),
    events: ports.events.list(),
    auditReferences: ports.auditReferences.list(),
  };
}
