import { EDC_FRAMEWORK_VERSION } from "@/constants/enterprise-dialogue-center";
import type { EdcRegistrySnapshot } from "@/types/enterprise-dialogue-center";
import { getEdcPorts } from "./composition";

export function getEdcFrameworkVersion(): string {
  return EDC_FRAMEWORK_VERSION;
}

export function getEdcRegistrySnapshot(): EdcRegistrySnapshot {
  const ports = getEdcPorts();
  return {
    timelineEntries: ports.timeline.list(),
    auditReferences: ports.auditReferences.list(),
  };
}
