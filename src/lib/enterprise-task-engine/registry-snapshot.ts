import { ETE_FRAMEWORK_VERSION } from "@/constants/enterprise-task-engine";
import type { EteRegistrySnapshot } from "@/types/enterprise-task-engine";
import { getEtePorts } from "./composition";

export function getEteFrameworkVersion(): string {
  return ETE_FRAMEWORK_VERSION;
}

export function getEteRegistrySnapshot(): EteRegistrySnapshot {
  const ports = getEtePorts();
  return {
    tasks: ports.tasks.list(),
    auditReferences: ports.auditReferences.list(),
  };
}
