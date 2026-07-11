/**
 * EPDE registry snapshot.
 */

import { EPDE_FRAMEWORK_VERSION } from "@/constants/enterprise-policy-decision-engine";
import type { EpdeRegistrySnapshot } from "@/types/enterprise-policy-decision-engine";
import { getEpdePorts } from "./composition";

export function getEpdeFrameworkVersion(): string {
  return EPDE_FRAMEWORK_VERSION;
}

export function getEpdeRegistrySnapshot(): EpdeRegistrySnapshot {
  const ports = getEpdePorts();
  return {
    policies: ports.policies.list(),
    versions: ports.versions.list(),
    policyGroups: ports.policyGroups.list(),
    rules: ports.rules.list(),
    ruleSets: ports.ruleSets.list(),
    ruleGroups: ports.ruleGroups.list(),
    decisionTables: ports.decisionTables.list(),
    decisionTrees: ports.decisionTrees.list(),
    decisionMatrices: ports.decisionMatrices.list(),
    scoringModels: ports.scoringModels.list(),
    conflicts: ports.conflicts.list(),
    resolutions: ports.resolutions.list(),
    simulations: ports.simulations.list(),
    auditReferences: ports.auditReferences.list(),
  };
}
