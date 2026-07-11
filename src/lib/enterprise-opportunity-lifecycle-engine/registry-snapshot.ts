/**
 * EOLE registry snapshot.
 */

import { EOLE_FRAMEWORK_VERSION } from "@/constants/enterprise-opportunity-lifecycle-engine";
import type { EoleRegistrySnapshot } from "@/types/enterprise-opportunity-lifecycle-engine";
import { getEolePorts } from "./composition";

export function getEoleFrameworkVersion(): string {
  return EOLE_FRAMEWORK_VERSION;
}

export function getEoleRegistrySnapshot(): EoleRegistrySnapshot {
  const ports = getEolePorts();
  return {
    opportunities: ports.opportunities.list(),
    profiles: ports.profiles.list(),
    requirements: ports.requirements.list(),
    owners: ports.owners.list(),
    executors: ports.executors.list(),
    assignments: ports.assignments.list(),
    customerReferences: ports.customerReferences.list(),
    partnerReferences: ports.partnerReferences.list(),
    organizationReferences: ports.organizationReferences.list(),
    productReferences: ports.productReferences.list(),
    financialRequirements: ports.financialRequirements.list(),
    lifecycles: ports.lifecycles.list(),
    stages: ports.stages.list(),
    subStages: ports.subStages.list(),
    pipelines: ports.pipelines.list(),
    pipelineSnapshots: ports.pipelineSnapshots.list(),
    lenderReferences: ports.lenderReferences.list(),
    strategies: ports.strategies.list(),
    holds: ports.holds.list(),
    agingPolicies: ports.agingPolicies.list(),
    agings: ports.agings.list(),
    slas: ports.slas.list(),
    timelineEntries: ports.timeline.list(),
    auditReferences: ports.auditReferences.list(),
  };
}
