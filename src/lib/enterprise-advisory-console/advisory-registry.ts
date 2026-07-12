/**
 * EAC advisory registry — ingest, lifecycle, override, history.
 * User actions update advisory history only — never execute business actions.
 */

import { mapEacPriorityFromLevel } from "@/constants/enterprise-advisory-console";
import type {
  EacAdvisoryCard,
  EacFilterCriteria,
  EacLifecycleEvent,
  EacLifecycleState,
  EacOverrideRecord,
} from "@/types/enterprise-advisory-console";
import type { EdeDecisionResponse } from "@/types/enterprise-decision-engine";
import {
  maybeCreateEeiFromAdvisory,
  syncEeiFromAdvisoryLifecycle,
} from "@/lib/enterprise-experience-intelligence/experience-registry";
import { recordEacAudit } from "./audit-integration";
import { presentEacViaChanakya } from "./chanakya-presentation";
import { getEacPorts } from "./composition";
import { getEacOrchestrationConfig } from "./config";
import { publishEacLifecycleToDialogue } from "./dialogue-integration";
import { resolveEacLifecycleRules, resolveEacPriorityRules } from "./ecg-adapters";

function recordLifecycle(
  advisoryId: string,
  fromState: EacLifecycleState | null,
  toState: EacLifecycleState,
  actorId: string,
  remarks?: string,
): EacLifecycleEvent {
  const event: EacLifecycleEvent = {
    eventId: crypto.randomUUID(),
    advisoryId,
    fromState,
    toState,
    actorId,
    remarks,
    occurredOn: new Date().toISOString(),
  };
  getEacPorts().lifecycleEvents.save(event);
  recordEacAudit({
    entityId: event.eventId,
    entityType: "lifecycle_event",
    action: "lifecycle_changed",
    actorId,
    remarks: `EAC ${fromState ?? "∅"} → ${toState}`,
  });
  return event;
}

function assertTransition(from: EacLifecycleState, to: EacLifecycleState): void {
  const { rules } = resolveEacLifecycleRules();
  const allowed = rules.allowedTransitions[from] ?? [];
  if (!allowed.includes(to)) {
    throw new Error(`EAC lifecycle transition not allowed: ${from} → ${to}`);
  }
}

export function ingestEdeResponseAsAdvisory(
  response: EdeDecisionResponse,
  actorId: string,
): EacAdvisoryCard {
  const { rules } = resolveEacPriorityRules();
  const now = new Date().toISOString();
  const ctx = response.contextSnapshot;

  const card: EacAdvisoryCard = {
    advisoryId: crypto.randomUUID(),
    decisionId: response.decisionId,
    opportunityId: response.opportunityId ?? ctx.opportunityId,
    opportunityCode: ctx.opportunityCode,
    customerName: ctx.customerName,
    productRef: ctx.productRef,
    assignedRmLabel: ctx.assignedRmLabel,
    recommendation: response.recommendation,
    originalRecommendation: response.recommendation,
    confidence: response.confidence,
    advisoryLevel: response.advisoryLevel,
    advisoryLevelNumber: response.advisoryLevelNumber,
    priority: mapEacPriorityFromLevel(response.advisoryLevel, rules),
    recommendationType: response.decisionCategory,
    knowledgePackagesUsed: response.knowledgeUsed,
    reasoningTraceId: response.reasoningTraceId ?? response.reasoningTrace?.traceId,
    generatedBy:
      response.reasoningTrace?.generatedBy ??
      "Enterprise Decision Engine / Enterprise Reasoning Engine",
    source: response.reasoningTrace ? "ere" : "ede",
    status: "new",
    explainability: response.explainability,
    reasoningSummary: response.reasoningTrace?.finalReasoningPath?.join(" → "),
    supportingEvidence:
      response.explainability?.highestImpactEvidence ??
      response.evidence.evidenceUsed.slice(0, 8),
    suggestedNextSteps: response.suggestedNextSteps,
    executable: false,
    createdOn: now,
    modifiedOn: now,
  };

  getEacPorts().advisories.save(card);
  recordLifecycle(card.advisoryId, null, "new", actorId, "Advisory card issued");
  recordEacAudit({
    entityId: card.advisoryId,
    entityType: "advisory",
    action: "created",
    actorId,
    remarks: `EAC advisory ${card.recommendationType} confidence=${card.confidence}`,
  });
  publishEacLifecycleToDialogue(card, "new", actorId);
  maybeCreateEeiFromAdvisory(card, actorId);
  return card;
}

export function getEacAdvisory(advisoryId: string): EacAdvisoryCard | undefined {
  return getEacPorts().advisories.findById(advisoryId);
}

export function listEacAdvisories(opportunityId?: string): EacAdvisoryCard[] {
  const rows = opportunityId
    ? getEacPorts().advisories.listByOpportunity(opportunityId)
    : getEacPorts().advisories.list();
  return [...rows].sort(
    (a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime(),
  );
}

export function filterEacAdvisories(criteria: EacFilterCriteria): EacAdvisoryCard[] {
  return listEacAdvisories().filter((card) => {
    if (criteria.advisoryLevel && criteria.advisoryLevel !== "all") {
      if (card.advisoryLevel !== criteria.advisoryLevel) return false;
    }
    if (criteria.status && criteria.status !== "all") {
      if (card.status !== criteria.status) return false;
    }
    if (criteria.opportunityId && card.opportunityId !== criteria.opportunityId) return false;
    if (criteria.opportunityQuery) {
      const q = criteria.opportunityQuery.toLowerCase();
      const hay = `${card.opportunityCode ?? ""} ${card.opportunityId ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (criteria.customerQuery) {
      if (!(card.customerName ?? "").toLowerCase().includes(criteria.customerQuery.toLowerCase())) {
        return false;
      }
    }
    if (criteria.productQuery) {
      if (!(card.productRef ?? "").toLowerCase().includes(criteria.productQuery.toLowerCase())) {
        return false;
      }
    }
    if (criteria.rmQuery) {
      if (
        !(card.assignedRmLabel ?? "").toLowerCase().includes(criteria.rmQuery.toLowerCase())
      ) {
        return false;
      }
    }
    if (criteria.dateFrom && card.createdOn < criteria.dateFrom) return false;
    if (criteria.dateTo && card.createdOn > criteria.dateTo) return false;
    if (criteria.confidenceMin != null && card.confidence < criteria.confidenceMin) return false;
    if (criteria.confidenceMax != null && card.confidence > criteria.confidenceMax) return false;
    if (criteria.recommendationType && criteria.recommendationType !== "all") {
      if (card.recommendationType !== criteria.recommendationType) return false;
    }
    if (criteria.priority && criteria.priority !== "all") {
      if (card.priority !== criteria.priority) return false;
    }
    if (criteria.source && criteria.source !== "all") {
      if (card.source !== criteria.source) return false;
    }
    return true;
  });
}

function applyState(
  advisoryId: string,
  toState: EacLifecycleState,
  actorId: string,
  extras?: {
    remarks?: string;
    override?: Omit<EacOverrideRecord, "overrideId" | "advisoryId" | "userId" | "timestamp">;
    userResponse?: string;
    finalOutcome?: string;
  },
): EacAdvisoryCard {
  const existing = getEacAdvisory(advisoryId);
  if (!existing) throw new Error("EAC advisory not found");
  if (existing.status !== toState) {
    assertTransition(existing.status, toState);
  }

  const now = new Date().toISOString();
  let override = existing.override;

  if (toState === "overridden") {
    if (!extras?.override?.reason || !extras.override.businessJustification) {
      throw new Error("Override requires reason and businessJustification");
    }
    const record: EacOverrideRecord = {
      overrideId: crypto.randomUUID(),
      advisoryId,
      userId: actorId,
      timestamp: now,
      reason: extras.override.reason,
      businessJustification: extras.override.businessJustification,
      finalOutcome: extras.override.finalOutcome ?? extras.finalOutcome ?? "overridden",
    };
    getEacPorts().overrides.save(record);
    recordEacAudit({
      entityId: record.overrideId,
      entityType: "override",
      action: "created",
      actorId,
      remarks: `EAC override ${advisoryId}: ${record.reason}`,
    });
    override = record;
  }

  const updated: EacAdvisoryCard = {
    ...existing,
    status: toState,
    remarks: extras?.remarks ?? existing.remarks,
    override,
    userResponse: extras?.userResponse ?? toState,
    finalOutcome:
      extras?.finalOutcome ??
      override?.finalOutcome ??
      (toState === "accepted"
        ? "followed"
        : toState === "completed"
          ? "completed"
          : toState === "dismissed"
            ? "dismissed"
            : toState === "deferred"
              ? "deferred"
              : existing.finalOutcome),
    viewedOn: toState === "viewed" ? now : existing.viewedOn ?? (toState !== "new" ? now : undefined),
    completedOn: toState === "completed" || toState === "dismissed" ? now : existing.completedOn,
    modifiedOn: now,
  };

  getEacPorts().advisories.save(updated);
  recordLifecycle(advisoryId, existing.status, toState, actorId, extras?.remarks);
  recordEacAudit({
    entityId: advisoryId,
    entityType: "advisory",
    action: "lifecycle_changed",
    actorId,
    remarks: `EAC status ${toState}`,
  });
  publishEacLifecycleToDialogue(updated, toState, actorId);
  syncEeiFromAdvisoryLifecycle(updated, toState, actorId, extras?.remarks);
  return updated;
}

export function viewEacAdvisory(advisoryId: string, actorId: string): EacAdvisoryCard {
  const card = getEacAdvisory(advisoryId);
  if (!card) throw new Error("EAC advisory not found");
  if (card.status === "new") {
    return applyState(advisoryId, "viewed", actorId, { userResponse: "viewed" });
  }
  return card;
}

export function acceptEacAdvisory(
  advisoryId: string,
  actorId: string,
  remarks?: string,
): EacAdvisoryCard {
  return applyState(advisoryId, "accepted", actorId, {
    remarks,
    userResponse: "accepted",
    finalOutcome: "followed",
  });
}

export function deferEacAdvisory(
  advisoryId: string,
  actorId: string,
  remarks?: string,
): EacAdvisoryCard {
  return applyState(advisoryId, "deferred", actorId, {
    remarks,
    userResponse: "deferred",
    finalOutcome: "deferred",
  });
}

export function overrideEacAdvisory(input: {
  advisoryId: string;
  actorId: string;
  reason: string;
  businessJustification: string;
  finalOutcome?: string;
  remarks?: string;
}): EacAdvisoryCard {
  return applyState(input.advisoryId, "overridden", input.actorId, {
    remarks: input.remarks,
    userResponse: "overridden",
    finalOutcome: input.finalOutcome ?? "overridden",
    override: {
      reason: input.reason,
      businessJustification: input.businessJustification,
      finalOutcome: input.finalOutcome ?? "overridden",
    },
  });
}

export function completeEacAdvisory(
  advisoryId: string,
  actorId: string,
  remarks?: string,
): EacAdvisoryCard {
  return applyState(advisoryId, "completed", actorId, {
    remarks,
    userResponse: "completed",
    finalOutcome: "completed",
  });
}

export function dismissEacAdvisory(
  advisoryId: string,
  actorId: string,
  remarks?: string,
): EacAdvisoryCard {
  return applyState(advisoryId, "dismissed", actorId, {
    remarks,
    userResponse: "dismissed",
    finalOutcome: "dismissed",
  });
}

export function addEacRemarks(
  advisoryId: string,
  actorId: string,
  remarks: string,
): EacAdvisoryCard {
  const existing = getEacAdvisory(advisoryId);
  if (!existing) throw new Error("EAC advisory not found");
  const updated: EacAdvisoryCard = {
    ...existing,
    remarks,
    modifiedOn: new Date().toISOString(),
  };
  getEacPorts().advisories.save(updated);
  recordEacAudit({
    entityId: advisoryId,
    entityType: "advisory",
    action: "modified",
    actorId,
    remarks: `EAC remarks updated`,
  });
  return updated;
}

export function listEacLifecycleEvents(advisoryId?: string): EacLifecycleEvent[] {
  const rows = advisoryId
    ? getEacPorts().lifecycleEvents.listByAdvisory(advisoryId)
    : getEacPorts().lifecycleEvents.list();
  return [...rows].sort(
    (a, b) => new Date(b.occurredOn).getTime() - new Date(a.occurredOn).getTime(),
  );
}

export function listEacOverrides(advisoryId?: string): EacOverrideRecord[] {
  const rows = advisoryId
    ? getEacPorts().overrides.listByAdvisory(advisoryId)
    : getEacPorts().overrides.list();
  return [...rows].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

/** Helper for EDE pipeline — ingest when config allows. */
export function maybeIngestEdeResponse(
  response: EdeDecisionResponse,
  actorId: string,
): EacAdvisoryCard | null {
  if (!getEacOrchestrationConfig().autoIngestFromEde) return null;
  return ingestEdeResponseAsAdvisory(response, actorId);
}

export function getEacChanakyaForAdvisory(advisoryId: string) {
  const card = getEacAdvisory(advisoryId);
  if (!card) return null;
  return presentEacViaChanakya(card);
}
