/**
 * EAC registry snapshot.
 */

import { EAC_FRAMEWORK_VERSION } from "@/constants/enterprise-advisory-console";
import type { EacRegistrySnapshot } from "@/types/enterprise-advisory-console";
import { getEacPorts } from "./composition";

export function getEacFrameworkVersion(): string {
  return EAC_FRAMEWORK_VERSION;
}

export function getEacRegistrySnapshot(): EacRegistrySnapshot {
  const ports = getEacPorts();
  return {
    advisories: ports.advisories.list(),
    lifecycleEvents: ports.lifecycleEvents.list(),
    overrides: ports.overrides.list(),
    auditReferences: ports.auditReferences.list(),
  };
}
