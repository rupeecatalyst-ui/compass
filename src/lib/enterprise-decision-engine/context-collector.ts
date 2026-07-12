/**
 * EDE context collector — Observe only. No analysis.
 */

import type {
  EdeContextCollectionInput,
  EdeDecisionContext,
} from "@/types/enterprise-decision-engine";

export function collectEdeDecisionContext(
  input: EdeContextCollectionInput = {},
): EdeDecisionContext {
  return {
    opportunityId: input.opportunityId,
    opportunityCode: input.opportunityCode,
    customerName: input.customerName,
    customerRef: input.customerRef,
    contactRoles: input.contactRoles,
    productRef: input.productRef,
    stageCode: input.stageCode,
    subStageCode: input.subStageCode,
    documentRequiredCount: input.documentRequiredCount,
    documentUploadedCount: input.documentUploadedCount,
    documentVerifiedCount: input.documentVerifiedCount,
    openTaskCount: input.openTaskCount,
    overdueTaskCount: input.overdueTaskCount,
    completedTaskCount: input.completedTaskCount,
    pulseLabel: input.pulseLabel,
    pulseIntensity: input.pulseIntensity,
    healthScore: input.healthScore,
    healthBand: input.healthBand,
    lifeLenderName: input.lifeLenderName,
    lifeRecommended: input.lifeRecommended,
    lifeSuccessProbability: input.lifeSuccessProbability,
    workflowStatus: input.workflowStatus,
    workflowProgressRatio: input.workflowProgressRatio,
    workflowDefinitionCode: input.workflowDefinitionCode,
    communicationEventCount: input.communicationEventCount,
    daysSinceLastActivity: input.daysSinceLastActivity,
    assignedRmLabel: input.assignedRmLabel,
    dialogueSummary: input.dialogueSummary,
    communicationSummary: input.communicationSummary,
    collectedOn: input.collectedOn ?? new Date().toISOString(),
    extras: input.extras,
  };
}
