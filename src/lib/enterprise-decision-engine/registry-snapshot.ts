/**
 * EDE registry snapshot.
 */

import { EDE_FRAMEWORK_VERSION } from "@/constants/enterprise-decision-engine";
import type { EdeRegistrySnapshot } from "@/types/enterprise-decision-engine";
import { getEdePorts } from "./composition";

export function getEdeFrameworkVersion(): string {
  return EDE_FRAMEWORK_VERSION;
}

export function getEdeRegistrySnapshot(): EdeRegistrySnapshot {
  const ports = getEdePorts();
  return {
    requests: ports.requests.list(),
    responses: ports.responses.list(),
    history: ports.history.list(),
    knowledgePackages: ports.knowledgePackages.list(),
    reasoningTraces: ports.reasoningTraces.list(),
    auditReferences: ports.auditReferences.list(),
  };
}
