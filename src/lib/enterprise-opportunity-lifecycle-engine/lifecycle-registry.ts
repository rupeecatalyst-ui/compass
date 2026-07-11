/**
 * EOLE lifecycle registry — stage transitions, holds, and closure.
 */

import {
  EOLE_DEFAULT_MAX_HOLD_PERIOD_DAYS,
  EOLE_HOLD_STATUS,
  EOLE_OPPORTUNITY_LIFECYCLE_ACTION_MAP,
} from "@/constants/enterprise-opportunity-lifecycle-engine";
import type {
  EoleOpportunity,
  EoleOpportunityHold,
  EoleOpportunityLifecycle,
  EoleOpportunityLifecycleStatus,
} from "@/types/enterprise-opportunity-lifecycle-engine";
import { recordEoleAudit } from "./audit-integration";
import { getEolePorts } from "./composition";
import { appendEoleTimelineEntry } from "./timeline-registry";
import {
  isEoleTerminalStatus,
  validateEoleHold,
  validateEoleLifecycleTransition,
  validateEoleStage,
} from "./validation-engine";

export function transitionEoleOpportunityLifecycle(input: {
  opportunityId: string;
  action: string;
  actorId: string;
  stageCode?: string;
  subStageCode?: string;
  remarks?: string;
}): EoleOpportunity {
  const opportunity = getEolePorts().opportunities.findById(input.opportunityId);
  if (!opportunity) throw new Error(`EOLE: opportunity "${input.opportunityId}" not found.`);

  if (isEoleTerminalStatus(opportunity.lifecycleStatus) && opportunity.closedOn) {
    throw new Error("EOLE: Closed opportunities are immutable and cannot be reopened.");
  }

  const toStatus = EOLE_OPPORTUNITY_LIFECYCLE_ACTION_MAP[input.action] as EoleOpportunityLifecycleStatus | undefined;
  if (!toStatus) throw new Error(`EOLE: unknown lifecycle action "${input.action}".`);

  const transition = validateEoleLifecycleTransition(opportunity.lifecycleStatus, toStatus);
  if (!transition.valid) throw new Error(transition.issues.map((i) => i.message).join("; "));

  if (input.stageCode) {
    const stageValidation = validateEoleStage(input.stageCode, getEolePorts().stages.list());
    if (!stageValidation.valid) throw new Error(stageValidation.issues.map((i) => i.message).join("; "));
  }

  const now = new Date().toISOString();
  const updated: EoleOpportunity = {
    ...opportunity,
    lifecycleStatus: toStatus,
    stageCode: input.stageCode ?? opportunity.stageCode,
    subStageCode: input.subStageCode ?? opportunity.subStageCode,
    modifiedBy: input.actorId,
    modifiedOn: now,
    closedOn: isEoleTerminalStatus(toStatus) ? now : opportunity.closedOn,
  };

  getEolePorts().opportunities.save(updated);

  const lifecycleRecord: EoleOpportunityLifecycle = {
    id: crypto.randomUUID(),
    opportunityId: opportunity.id,
    fromStatus: opportunity.lifecycleStatus,
    toStatus,
    action: input.action,
    actorId: input.actorId,
    transitionedOn: now,
    remarks: input.remarks,
  };
  getEolePorts().lifecycles.save(lifecycleRecord);

  recordEoleAudit({
    entityId: opportunity.id,
    entityType: "lifecycle",
    action: isEoleTerminalStatus(toStatus) ? "closed" : "lifecycle_changed",
    actorId: input.actorId,
    previousStateRef: opportunity.lifecycleStatus,
    newStateRef: toStatus,
    remarks: input.remarks,
  });

  const eventType =
    input.action === "reject"
      ? "rejection"
      : input.action === "approve"
        ? "approval"
        : input.action === "partial_disburse" || input.action === "full_disburse"
          ? "disbursement"
          : isEoleTerminalStatus(toStatus)
            ? "closure"
            : "stage_changed";

  appendEoleTimelineEntry({
    opportunityId: opportunity.id,
    eventType,
    title: `Lifecycle: ${input.action}`,
    description: `Transitioned from ${opportunity.lifecycleStatus} to ${toStatus}`,
    actorId: input.actorId,
    metadata: { stageCode: updated.stageCode, subStageCode: updated.subStageCode },
  });

  return updated;
}

export function placeEoleOpportunityOnHold(input: {
  opportunityId: string;
  holdCode: string;
  holdReason: string;
  expectedResumeDate?: string;
  reviewDate?: string;
  holdDurationDays: number;
  maxHoldPeriodDays?: number;
  createdBy: string;
}): EoleOpportunityHold {
  const opportunity = getEolePorts().opportunities.findById(input.opportunityId);
  if (!opportunity) throw new Error(`EOLE: opportunity "${input.opportunityId}" not found.`);

  const hold: EoleOpportunityHold = {
    id: crypto.randomUUID(),
    opportunityId: input.opportunityId,
    holdCode: input.holdCode,
    holdReason: input.holdReason,
    holdDate: new Date().toISOString(),
    expectedResumeDate: input.expectedResumeDate,
    reviewDate: input.reviewDate,
    holdDurationDays: input.holdDurationDays,
    maxHoldPeriodDays: input.maxHoldPeriodDays ?? EOLE_DEFAULT_MAX_HOLD_PERIOD_DAYS,
    status: EOLE_HOLD_STATUS.ACTIVE,
    recommendClosure: input.holdDurationDays >= (input.maxHoldPeriodDays ?? EOLE_DEFAULT_MAX_HOLD_PERIOD_DAYS),
    createdBy: input.createdBy,
    createdOn: new Date().toISOString(),
  };

  const validation = validateEoleHold(hold);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEolePorts().holds.save(hold);
  transitionEoleOpportunityLifecycle({
    opportunityId: input.opportunityId,
    action: "hold",
    actorId: input.createdBy,
    remarks: input.holdReason,
  });

  recordEoleAudit({
    entityId: hold.id,
    entityType: "hold",
    action: "hold",
    actorId: input.createdBy,
    remarks: `Hold placed: ${input.holdReason}`,
  });
  appendEoleTimelineEntry({
    opportunityId: input.opportunityId,
    eventType: "hold",
    title: "Opportunity On Hold",
    description: input.holdReason,
    actorId: input.createdBy,
  });

  return hold;
}

export function resumeEoleOpportunityFromHold(input: {
  holdId: string;
  resumedBy: string;
  resumeAction?: string;
}): EoleOpportunity {
  const hold = getEolePorts().holds.list().find((h) => h.id === input.holdId);
  if (!hold) throw new Error(`EOLE: hold "${input.holdId}" not found.`);

  const updatedHold: EoleOpportunityHold = {
    ...hold,
    status: EOLE_HOLD_STATUS.RESUMED,
    resumedOn: new Date().toISOString(),
  };
  getEolePorts().holds.save(updatedHold);

  const opportunity = transitionEoleOpportunityLifecycle({
    opportunityId: hold.opportunityId,
    action: input.resumeAction ?? "begin_processing",
    actorId: input.resumedBy,
    remarks: "Resumed from hold",
  });

  recordEoleAudit({
    entityId: hold.id,
    entityType: "hold",
    action: "resumed",
    actorId: input.resumedBy,
    remarks: "Hold resumed",
  });
  appendEoleTimelineEntry({
    opportunityId: hold.opportunityId,
    eventType: "resume",
    title: "Opportunity Resumed",
    description: "Opportunity resumed from hold",
    actorId: input.resumedBy,
  });

  return opportunity;
}

export function closeEoleOpportunity(input: {
  opportunityId: string;
  action: "reject" | "cancel" | "expire" | "archive" | "full_disburse";
  actorId: string;
  remarks?: string;
}): EoleOpportunity {
  const opportunity = getEolePorts().opportunities.findById(input.opportunityId);
  if (!opportunity) throw new Error(`EOLE: opportunity "${input.opportunityId}" not found.`);

  if (opportunity.closedOn) {
    throw new Error("EOLE: Opportunity is already closed and immutable.");
  }

  return transitionEoleOpportunityLifecycle({
    opportunityId: input.opportunityId,
    action: input.action,
    actorId: input.actorId,
    stageCode: "closed",
    remarks: input.remarks,
  });
}

export function syncEoleOpportunityDisbursement(input: {
  opportunityId: string;
  transactionRef: string;
  disbursementStatus: "not_disbursed" | "partially_disbursed" | "fully_disbursed";
  actorId: string;
}): EoleOpportunity {
  const opportunity = getEolePorts().opportunities.findById(input.opportunityId);
  if (!opportunity) throw new Error(`EOLE: opportunity "${input.opportunityId}" not found.`);

  const action =
    input.disbursementStatus === "fully_disbursed"
      ? "full_disburse"
      : input.disbursementStatus === "partially_disbursed"
        ? "partial_disburse"
        : undefined;

  if (!action) return opportunity;

  const updated = transitionEoleOpportunityLifecycle({
    opportunityId: input.opportunityId,
    action,
    actorId: input.actorId,
    stageCode: "disbursement",
  });

  getEolePorts().opportunities.save({
    ...updated,
    transactionRef: input.transactionRef,
  });

  return getEolePorts().opportunities.findById(input.opportunityId)!;
}

export function changeEoleOpportunityStage(input: {
  opportunityId: string;
  stageCode: string;
  subStageCode?: string;
  actorId: string;
}): EoleOpportunity {
  const opportunity = getEolePorts().opportunities.findById(input.opportunityId);
  if (!opportunity) throw new Error(`EOLE: opportunity "${input.opportunityId}" not found.`);

  const stageValidation = validateEoleStage(input.stageCode, getEolePorts().stages.list());
  if (!stageValidation.valid) throw new Error(stageValidation.issues.map((i) => i.message).join("; "));

  const updated: EoleOpportunity = {
    ...opportunity,
    stageCode: input.stageCode,
    subStageCode: input.subStageCode,
    modifiedBy: input.actorId,
    modifiedOn: new Date().toISOString(),
  };
  getEolePorts().opportunities.save(updated);

  appendEoleTimelineEntry({
    opportunityId: opportunity.id,
    eventType: input.subStageCode ? "sub_stage_changed" : "stage_changed",
    title: input.subStageCode ? "Sub-stage Changed" : "Stage Changed",
    description: `Moved to ${input.stageCode}${input.subStageCode ? ` / ${input.subStageCode}` : ""}`,
    actorId: input.actorId,
  });

  return updated;
}
