/**
 * EOLE Ports — repository contracts.
 */

import type {
  EoleOpportunity,
  EoleOpportunityAging,
  EoleOpportunityAgingPolicy,
  EoleOpportunityAssignment,
  EoleOpportunityAuditReference,
  EoleOpportunityCustomerReference,
  EoleOpportunityExecutor,
  EoleOpportunityFinancialRequirement,
  EoleOpportunityHold,
  EoleOpportunityLenderReference,
  EoleOpportunityLifecycle,
  EoleOpportunityOrganizationReference,
  EoleOpportunityOwner,
  EoleOpportunityPartnerReference,
  EoleOpportunityPipeline,
  EoleOpportunityPipelineSnapshot,
  EoleOpportunityProductReference,
  EoleOpportunityProfile,
  EoleOpportunityRequirement,
  EoleOpportunitySla,
  EoleOpportunityStage,
  EoleOpportunityStrategy,
  EoleOpportunitySubStage,
  EoleOpportunityTimelineEntry,
  EoleRegistrySnapshot,
} from "./enterprise-opportunity-lifecycle-engine";

export interface EoleOpportunityRepositoryPort {
  list(): EoleOpportunity[];
  findById(id: string): EoleOpportunity | undefined;
  findByCode(opportunityCode: string): EoleOpportunity | undefined;
  findByEnterpriseId(enterpriseOpportunityId: string): EoleOpportunity | undefined;
  listByCustomer(customerRef: string): EoleOpportunity[];
  save(opportunity: EoleOpportunity): void;
  replaceAll(opportunities: EoleOpportunity[]): void;
}

export interface EoleOpportunityProfileRepositoryPort {
  list(): EoleOpportunityProfile[];
  listByOpportunity(opportunityId: string): EoleOpportunityProfile[];
  save(profile: EoleOpportunityProfile): void;
  replaceAll(profiles: EoleOpportunityProfile[]): void;
}

export interface EoleOpportunityRequirementRepositoryPort {
  list(): EoleOpportunityRequirement[];
  listByOpportunity(opportunityId: string): EoleOpportunityRequirement[];
  save(requirement: EoleOpportunityRequirement): void;
  replaceAll(requirements: EoleOpportunityRequirement[]): void;
}

export interface EoleOpportunityOwnerRepositoryPort {
  list(): EoleOpportunityOwner[];
  listByOpportunity(opportunityId: string): EoleOpportunityOwner[];
  findSourceOwner(opportunityId: string): EoleOpportunityOwner | undefined;
  save(owner: EoleOpportunityOwner): void;
  replaceAll(owners: EoleOpportunityOwner[]): void;
}

export interface EoleOpportunityExecutorRepositoryPort {
  list(): EoleOpportunityExecutor[];
  listByOpportunity(opportunityId: string): EoleOpportunityExecutor[];
  listActiveByOpportunity(opportunityId: string): EoleOpportunityExecutor[];
  save(executor: EoleOpportunityExecutor): void;
  replaceAll(executors: EoleOpportunityExecutor[]): void;
}

export interface EoleOpportunityAssignmentRepositoryPort {
  list(): EoleOpportunityAssignment[];
  listByOpportunity(opportunityId: string): EoleOpportunityAssignment[];
  save(assignment: EoleOpportunityAssignment): void;
  replaceAll(assignments: EoleOpportunityAssignment[]): void;
}

export interface EoleOpportunityCustomerReferenceRepositoryPort {
  list(): EoleOpportunityCustomerReference[];
  listByOpportunity(opportunityId: string): EoleOpportunityCustomerReference[];
  save(reference: EoleOpportunityCustomerReference): void;
  replaceAll(references: EoleOpportunityCustomerReference[]): void;
}

export interface EoleOpportunityPartnerReferenceRepositoryPort {
  list(): EoleOpportunityPartnerReference[];
  listByOpportunity(opportunityId: string): EoleOpportunityPartnerReference[];
  save(reference: EoleOpportunityPartnerReference): void;
  replaceAll(references: EoleOpportunityPartnerReference[]): void;
}

export interface EoleOpportunityOrganizationReferenceRepositoryPort {
  list(): EoleOpportunityOrganizationReference[];
  listByOpportunity(opportunityId: string): EoleOpportunityOrganizationReference[];
  save(reference: EoleOpportunityOrganizationReference): void;
  replaceAll(references: EoleOpportunityOrganizationReference[]): void;
}

export interface EoleOpportunityProductReferenceRepositoryPort {
  list(): EoleOpportunityProductReference[];
  listByOpportunity(opportunityId: string): EoleOpportunityProductReference[];
  save(reference: EoleOpportunityProductReference): void;
  replaceAll(references: EoleOpportunityProductReference[]): void;
}

export interface EoleOpportunityFinancialRequirementRepositoryPort {
  list(): EoleOpportunityFinancialRequirement[];
  listByOpportunity(opportunityId: string): EoleOpportunityFinancialRequirement[];
  save(requirement: EoleOpportunityFinancialRequirement): void;
  replaceAll(requirements: EoleOpportunityFinancialRequirement[]): void;
}

export interface EoleOpportunityLifecycleRepositoryPort {
  list(): EoleOpportunityLifecycle[];
  listByOpportunity(opportunityId: string): EoleOpportunityLifecycle[];
  save(lifecycle: EoleOpportunityLifecycle): void;
  replaceAll(lifecycles: EoleOpportunityLifecycle[]): void;
}

export interface EoleOpportunityStageRepositoryPort {
  list(): EoleOpportunityStage[];
  findByCode(stageCode: string): EoleOpportunityStage | undefined;
  save(stage: EoleOpportunityStage): void;
  replaceAll(stages: EoleOpportunityStage[]): void;
}

export interface EoleOpportunitySubStageRepositoryPort {
  list(): EoleOpportunitySubStage[];
  findByCode(stageCode: string, subStageCode: string): EoleOpportunitySubStage | undefined;
  listByStage(stageCode: string): EoleOpportunitySubStage[];
  save(subStage: EoleOpportunitySubStage): void;
  replaceAll(subStages: EoleOpportunitySubStage[]): void;
}

export interface EoleOpportunityPipelineRepositoryPort {
  list(): EoleOpportunityPipeline[];
  findById(id: string): EoleOpportunityPipeline | undefined;
  listByOpportunity(opportunityId: string): EoleOpportunityPipeline[];
  save(pipeline: EoleOpportunityPipeline): void;
  replaceAll(pipelines: EoleOpportunityPipeline[]): void;
}

export interface EoleOpportunityPipelineSnapshotRepositoryPort {
  list(): EoleOpportunityPipelineSnapshot[];
  listByPipeline(pipelineId: string): EoleOpportunityPipelineSnapshot[];
  save(snapshot: EoleOpportunityPipelineSnapshot): void;
  replaceAll(snapshots: EoleOpportunityPipelineSnapshot[]): void;
}

export interface EoleOpportunityLenderReferenceRepositoryPort {
  list(): EoleOpportunityLenderReference[];
  listByOpportunity(opportunityId: string): EoleOpportunityLenderReference[];
  listByPipeline(pipelineId: string): EoleOpportunityLenderReference[];
  save(reference: EoleOpportunityLenderReference): void;
  replaceAll(references: EoleOpportunityLenderReference[]): void;
}

export interface EoleOpportunityStrategyRepositoryPort {
  list(): EoleOpportunityStrategy[];
  listByOpportunity(opportunityId: string): EoleOpportunityStrategy[];
  save(strategy: EoleOpportunityStrategy): void;
  replaceAll(strategies: EoleOpportunityStrategy[]): void;
}

export interface EoleOpportunityHoldRepositoryPort {
  list(): EoleOpportunityHold[];
  listByOpportunity(opportunityId: string): EoleOpportunityHold[];
  findActiveByOpportunity(opportunityId: string): EoleOpportunityHold | undefined;
  save(hold: EoleOpportunityHold): void;
  replaceAll(holds: EoleOpportunityHold[]): void;
}

export interface EoleOpportunityAgingPolicyRepositoryPort {
  list(): EoleOpportunityAgingPolicy[];
  findByCode(policyCode: string): EoleOpportunityAgingPolicy | undefined;
  findByStage(stageCode: string): EoleOpportunityAgingPolicy | undefined;
  save(policy: EoleOpportunityAgingPolicy): void;
  replaceAll(policies: EoleOpportunityAgingPolicy[]): void;
}

export interface EoleOpportunityAgingRepositoryPort {
  list(): EoleOpportunityAging[];
  listByOpportunity(opportunityId: string): EoleOpportunityAging[];
  save(aging: EoleOpportunityAging): void;
  replaceAll(agings: EoleOpportunityAging[]): void;
}

export interface EoleOpportunitySlaRepositoryPort {
  list(): EoleOpportunitySla[];
  listByOpportunity(opportunityId: string): EoleOpportunitySla[];
  save(sla: EoleOpportunitySla): void;
  replaceAll(slas: EoleOpportunitySla[]): void;
}

export interface EoleOpportunityTimelineRepositoryPort {
  list(): EoleOpportunityTimelineEntry[];
  listByOpportunity(opportunityId: string): EoleOpportunityTimelineEntry[];
  save(entry: EoleOpportunityTimelineEntry): void;
  replaceAll(entries: EoleOpportunityTimelineEntry[]): void;
}

export interface EoleOpportunityAuditReferenceRepositoryPort {
  list(): EoleOpportunityAuditReference[];
  save(reference: EoleOpportunityAuditReference): void;
  replaceAll(references: EoleOpportunityAuditReference[]): void;
}

export interface EolePorts {
  opportunities: EoleOpportunityRepositoryPort;
  profiles: EoleOpportunityProfileRepositoryPort;
  requirements: EoleOpportunityRequirementRepositoryPort;
  owners: EoleOpportunityOwnerRepositoryPort;
  executors: EoleOpportunityExecutorRepositoryPort;
  assignments: EoleOpportunityAssignmentRepositoryPort;
  customerReferences: EoleOpportunityCustomerReferenceRepositoryPort;
  partnerReferences: EoleOpportunityPartnerReferenceRepositoryPort;
  organizationReferences: EoleOpportunityOrganizationReferenceRepositoryPort;
  productReferences: EoleOpportunityProductReferenceRepositoryPort;
  financialRequirements: EoleOpportunityFinancialRequirementRepositoryPort;
  lifecycles: EoleOpportunityLifecycleRepositoryPort;
  stages: EoleOpportunityStageRepositoryPort;
  subStages: EoleOpportunitySubStageRepositoryPort;
  pipelines: EoleOpportunityPipelineRepositoryPort;
  pipelineSnapshots: EoleOpportunityPipelineSnapshotRepositoryPort;
  lenderReferences: EoleOpportunityLenderReferenceRepositoryPort;
  strategies: EoleOpportunityStrategyRepositoryPort;
  holds: EoleOpportunityHoldRepositoryPort;
  agingPolicies: EoleOpportunityAgingPolicyRepositoryPort;
  agings: EoleOpportunityAgingRepositoryPort;
  slas: EoleOpportunitySlaRepositoryPort;
  timeline: EoleOpportunityTimelineRepositoryPort;
  auditReferences: EoleOpportunityAuditReferenceRepositoryPort;
}

export type PartialEolePorts = Partial<EolePorts>;

export type { EoleRegistrySnapshot };
