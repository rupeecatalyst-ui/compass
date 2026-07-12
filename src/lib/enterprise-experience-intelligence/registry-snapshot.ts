/**
 * EEI registry snapshot.
 */

import { EEI_FRAMEWORK_VERSION } from "@/constants/enterprise-experience-intelligence";
import type { EeiRegistrySnapshot } from "@/types/enterprise-experience-intelligence";
import { getEeiPorts } from "./composition";

export function getEeiFrameworkVersion(): string {
  return EEI_FRAMEWORK_VERSION;
}

export function getEeiRegistrySnapshot(): EeiRegistrySnapshot {
  const ports = getEeiPorts();
  return {
    experiences: ports.experiences.list(),
    knowledgeFeedback: ports.knowledgeFeedback.list(),
    auditReferences: ports.auditReferences.list(),
  };
}
