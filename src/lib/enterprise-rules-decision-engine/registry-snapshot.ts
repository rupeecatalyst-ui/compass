/**
 * ERDE registry snapshot.
 */

import { ERDE_FRAMEWORK_VERSION } from "@/constants/enterprise-rules-decision-engine";
import type { ErdeRegistrySnapshot } from "@/types/enterprise-rules-decision-engine";
import { getErdePorts } from "./composition";

export function getErdeFrameworkVersion(): string {
  return ERDE_FRAMEWORK_VERSION;
}

export function getErdeRegistrySnapshot(): ErdeRegistrySnapshot {
  const ports = getErdePorts();
  return {
    rules: ports.rules.list(),
    versions: ports.versions.list(),
    ruleSets: ports.ruleSets.list(),
    ruleGroups: ports.ruleGroups.list(),
    decisionTables: ports.decisionTables.list(),
    decisionTrees: ports.decisionTrees.list(),
    executions: ports.executions.list(),
    auditReferences: ports.auditReferences.list(),
  };
}
