import { ENCE_FRAMEWORK_VERSION } from "@/constants/enterprise-notification-communication-engine";
import type { EnceRegistrySnapshot } from "@/types/enterprise-notification-communication-engine";
import { getEncePorts } from "./composition";

export function getEnceFrameworkVersion(): string {
  return ENCE_FRAMEWORK_VERSION;
}

export function getEnceRegistrySnapshot(): EnceRegistrySnapshot {
  const ports = getEncePorts();
  return {
    policies: ports.policies.list(),
    templates: ports.templates.list(),
    simulations: ports.simulations.list(),
    auditReferences: ports.auditReferences.list(),
  };
}
