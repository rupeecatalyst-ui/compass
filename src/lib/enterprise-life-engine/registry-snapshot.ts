import { LIFE_FRAMEWORK_VERSION } from "@/constants/enterprise-life-engine";
import type { LifeRegistrySnapshot } from "@/types/enterprise-life-engine";
import { getLifePorts } from "./composition";

export function getLifeFrameworkVersion(): string {
  return LIFE_FRAMEWORK_VERSION;
}

export function getLifeRegistrySnapshot(): LifeRegistrySnapshot {
  const ports = getLifePorts();
  return {
    contacts: ports.contacts.list(),
    recommendationHints: ports.recommendationHints.list(),
    auditReferences: ports.auditReferences.list(),
  };
}
