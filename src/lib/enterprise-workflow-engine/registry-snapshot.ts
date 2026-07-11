/**
 * EWE registry snapshot.
 */

import { EWE_FRAMEWORK_VERSION } from "@/constants/enterprise-workflow-engine";
import type { EweRegistrySnapshot } from "@/types/enterprise-workflow-engine";
import { getEwePorts } from "./composition";

export function getEweFrameworkVersion(): string {
  return EWE_FRAMEWORK_VERSION;
}

export function getEweRegistrySnapshot(): EweRegistrySnapshot {
  const ports = getEwePorts();
  return {
    definitions: ports.definitions.list(),
    versions: ports.versions.list(),
    instances: ports.instances.list(),
    auditReferences: ports.auditReferences.list(),
  };
}
