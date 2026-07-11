/**
 * EOLE pipeline registry — lender pipeline orchestration and snapshots.
 */

import {
  EOLE_DEFAULT_AGING_POLICIES,
  EOLE_DEFAULT_STAGES,
  EOLE_DEFAULT_SUB_STAGES,
  EOLE_LENDER_PIPELINE_OUTCOME,
  EOLE_PIPELINE_STATUS,
} from "@/constants/enterprise-opportunity-lifecycle-engine";
import type {
  EoleOpportunityAgingPolicy,
  EoleOpportunityLenderReference,
  EoleOpportunityPipeline,
  EoleOpportunityPipelineSnapshot,
  EoleOpportunityStage,
  EoleOpportunitySubStage,
} from "@/types/enterprise-opportunity-lifecycle-engine";
import { recordEoleAudit } from "./audit-integration";
import { getEolePorts } from "./composition";
import { appendEoleTimelineEntry } from "./timeline-registry";

export function initializeEoleStages(createdBy = "system"): EoleOpportunityStage[] {
  const existing = getEolePorts().stages.list();
  if (existing.length > 0) return existing;

  return EOLE_DEFAULT_STAGES.map((config) => {
    const stage: EoleOpportunityStage = {
      id: crypto.randomUUID(),
      stageCode: config.stageCode,
      stageName: config.stageName,
      lifecycleStatus: config.lifecycleStatus,
      sortOrder: config.sortOrder,
      terminal: config.terminal,
      enabled: true,
      createdBy,
      createdOn: new Date().toISOString(),
    };
    getEolePorts().stages.save(stage);
    return stage;
  });
}

export function initializeEoleSubStages(createdBy = "system"): EoleOpportunitySubStage[] {
  const existing = getEolePorts().subStages.list();
  if (existing.length > 0) return existing;

  return EOLE_DEFAULT_SUB_STAGES.map((config) => {
    const subStage: EoleOpportunitySubStage = {
      id: crypto.randomUUID(),
      stageCode: config.stageCode,
      subStageCode: config.subStageCode,
      subStageName: config.subStageName,
      sortOrder: config.sortOrder,
      enabled: true,
      createdBy,
      createdOn: new Date().toISOString(),
    };
    getEolePorts().subStages.save(subStage);
    return subStage;
  });
}

export function initializeEoleAgingPolicies(createdBy = "system"): EoleOpportunityAgingPolicy[] {
  const existing = getEolePorts().agingPolicies.list();
  if (existing.length > 0) return existing;

  return EOLE_DEFAULT_AGING_POLICIES.map((config) => {
    const policy: EoleOpportunityAgingPolicy = {
      id: crypto.randomUUID(),
      policyCode: config.policyCode,
      stageCode: config.stageCode,
      maxDays: config.maxDays,
      reminderDays: config.reminderDays,
      escalationDays: config.escalationDays,
      managerNotificationDays: config.managerNotificationDays,
      missionControlNotificationDays: config.missionControlNotificationDays,
      enabled: true,
      createdBy,
      createdOn: new Date().toISOString(),
    };
    getEolePorts().agingPolicies.save(policy);
    return policy;
  });
}

export function registerEolePipeline(
  input: Omit<EoleOpportunityPipeline, "id" | "status" | "startedOn" | "enabled" | "createdOn" | "completedOn">,
): EoleOpportunityPipeline {
  const pipeline: EoleOpportunityPipeline = {
    ...input,
    id: crypto.randomUUID(),
    status: EOLE_PIPELINE_STATUS.ACTIVE,
    startedOn: new Date().toISOString(),
    enabled: true,
    createdOn: new Date().toISOString(),
  };

  getEolePorts().pipelines.save(pipeline);

  const opportunity = getEolePorts().opportunities.findById(input.opportunityId);
  if (opportunity) {
    getEolePorts().opportunities.save({ ...opportunity, pipelineId: pipeline.id });
  }

  recordEoleAudit({
    entityId: pipeline.id,
    entityType: "pipeline",
    action: "created",
    actorId: input.createdBy,
    remarks: `Pipeline ${pipeline.pipelineCode} started`,
  });

  return pipeline;
}

export function captureEolePipelineSnapshot(input: {
  pipelineId: string;
  opportunityId: string;
  stageCode: string;
  subStageCode?: string;
  lifecycleStatus: EoleOpportunityPipelineSnapshot["lifecycleStatus"];
  capturedBy: string;
}): EoleOpportunityPipelineSnapshot {
  const snapshot: EoleOpportunityPipelineSnapshot = {
    id: crypto.randomUUID(),
    pipelineId: input.pipelineId,
    opportunityId: input.opportunityId,
    stageCode: input.stageCode,
    subStageCode: input.subStageCode,
    lifecycleStatus: input.lifecycleStatus,
    capturedOn: new Date().toISOString(),
    capturedBy: input.capturedBy,
  };

  getEolePorts().pipelineSnapshots.save(snapshot);
  return snapshot;
}

export function registerEoleLenderReference(
  input: Omit<
    EoleOpportunityLenderReference,
    "id" | "outcome" | "independent" | "enabled" | "createdOn" | "modifiedBy" | "modifiedOn"
  >,
): EoleOpportunityLenderReference {
  const now = new Date().toISOString();
  const reference: EoleOpportunityLenderReference = {
    ...input,
    id: crypto.randomUUID(),
    outcome: EOLE_LENDER_PIPELINE_OUTCOME.PENDING,
    independent: true,
    enabled: true,
    createdOn: now,
    modifiedBy: input.createdBy,
    modifiedOn: now,
  };

  getEolePorts().lenderReferences.save(reference);
  recordEoleAudit({
    entityId: reference.id,
    entityType: "lender_reference",
    action: "created",
    actorId: input.createdBy,
    remarks: `Lender pipeline ${reference.lenderRef} referenced`,
  });
  appendEoleTimelineEntry({
    opportunityId: input.opportunityId,
    eventType: "lender_pipeline_added",
    title: "Lender Pipeline Added",
    description: `Lender ${reference.lenderRef} pipeline referenced (independent execution)`,
    actorId: input.createdBy,
    metadata: { pipelineId: input.pipelineId, workflowRef: input.workflowRef },
  });

  return reference;
}

export function updateEoleLenderPipelineOutcome(input: {
  lenderReferenceId: string;
  outcome: EoleOpportunityLenderReference["outcome"];
  modifiedBy: string;
}): EoleOpportunityLenderReference {
  const reference = getEolePorts().lenderReferences.list().find((r) => r.id === input.lenderReferenceId);
  if (!reference) throw new Error(`EOLE: lender reference "${input.lenderReferenceId}" not found.`);

  const updated: EoleOpportunityLenderReference = {
    ...reference,
    outcome: input.outcome,
    modifiedBy: input.modifiedBy,
    modifiedOn: new Date().toISOString(),
  };
  getEolePorts().lenderReferences.save(updated);

  if (input.outcome === EOLE_LENDER_PIPELINE_OUTCOME.DISBURSED) {
    appendEoleTimelineEntry({
      opportunityId: reference.opportunityId,
      eventType: "disbursement",
      title: "Lender Disbursement",
      description: `Lender ${reference.lenderRef} disbursed`,
      actorId: input.modifiedBy,
    });
  } else if (input.outcome === EOLE_LENDER_PIPELINE_OUTCOME.REJECTED) {
    appendEoleTimelineEntry({
      opportunityId: reference.opportunityId,
      eventType: "rejection",
      title: "Lender Rejection",
      description: `Lender ${reference.lenderRef} rejected`,
      actorId: input.modifiedBy,
    });
  }

  return updated;
}

export function completeEolePipeline(input: {
  pipelineId: string;
  status: "completed" | "failed" | "withdrawn";
  modifiedBy: string;
}): EoleOpportunityPipeline {
  const pipeline = getEolePorts().pipelines.findById(input.pipelineId);
  if (!pipeline) throw new Error(`EOLE: pipeline "${input.pipelineId}" not found.`);

  const updated: EoleOpportunityPipeline = {
    ...pipeline,
    status: input.status,
    completedOn: new Date().toISOString(),
  };
  getEolePorts().pipelines.save(updated);
  return updated;
}

export function listEoleLenderPipelines(opportunityId: string): EoleOpportunityLenderReference[] {
  return getEolePorts().lenderReferences.listByOpportunity(opportunityId);
}
