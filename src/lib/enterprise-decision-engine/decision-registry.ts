/**
 * EDE decision registry — Observe → Analyse → Recommend → Explain → Record.
 * Advisory only. Never executes.
 */

import type {
  EdeContextCollectionInput,
  EdeDecisionCategory,
  EdeDecisionHistoryEntry,
  EdeDecisionRequest,
  EdeDecisionResponse,
  EdeDecisionType,
  EdeFinalOutcome,
  EdeTriggerSource,
  EdeUserAction,
} from "@/types/enterprise-decision-engine";
import { maybeIngestEdeResponse } from "@/lib/enterprise-advisory-console/advisory-registry";
import { recordEdeAudit } from "./audit-integration";
import { presentEdeDecisionViaChanakya } from "./chanakya-presentation";
import { getEdePorts } from "./composition";
import { collectEdeDecisionContext } from "./context-collector";
import { publishEdeDecisionToDialogue } from "./dialogue-integration";
import { evaluateEdeAgainstProfile } from "./evaluator";
import {
  composeDkfRecommendationFromKnowledge,
  evaluateDkfKnowledge,
} from "./knowledge-evaluator";
import { initializeDkfFrameworkScaffold } from "./knowledge-registry";
import { resolveEdeEvaluationProfile } from "./profile-resolver";
import { runEnterpriseReasoningEngine } from "./reasoning-engine";

/** Map early SPR-006A type aliases to categories. */
function normalizeCategory(
  categoryOrType: EdeDecisionCategory | EdeDecisionType | string,
): EdeDecisionCategory {
  const map: Record<string, EdeDecisionCategory> = {
    evaluate_opportunity: "opportunity_assessment",
    evaluate_lender: "lender_recommendation",
    evaluate_document_readiness: "document_readiness",
    evaluate_task_health: "task_assessment",
    evaluate_workflow: "workflow_assessment",
    opportunity_assessment: "opportunity_assessment",
    lender_recommendation: "lender_recommendation",
    document_readiness: "document_readiness",
    task_assessment: "task_assessment",
    workflow_assessment: "workflow_assessment",
    risk_observation: "risk_observation",
    customer_readiness: "customer_readiness",
  };
  return map[categoryOrType] ?? (categoryOrType as EdeDecisionCategory);
}

export function createEdeDecisionRequest(input: {
  decisionCategory?: EdeDecisionCategory;
  /** @deprecated Use decisionCategory. */
  decisionType?: EdeDecisionType | string;
  opportunityId?: string;
  contextInput?: EdeContextCollectionInput;
  triggerSource?: EdeTriggerSource;
  requestedBy: string;
  reason?: string;
}): EdeDecisionRequest {
  const decisionCategory = normalizeCategory(
    input.decisionCategory ?? input.decisionType ?? "opportunity_assessment",
  );
  const context = input.contextInput
    ? collectEdeDecisionContext(input.contextInput)
    : undefined;
  const decisionId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const request: EdeDecisionRequest = {
    decisionId,
    id: decisionId,
    opportunityId: input.opportunityId ?? input.contextInput?.opportunityId,
    decisionCategory,
    decisionType: decisionCategory,
    context,
    contextInput: input.contextInput,
    triggerSource: input.triggerSource ?? "manual",
    requestedBy: input.requestedBy,
    reason: input.reason,
    timestamp,
    requestedOn: timestamp,
  };

  getEdePorts().requests.save(request);
  recordEdeAudit({
    entityId: request.decisionId,
    entityType: "request",
    action: "created",
    actorId: input.requestedBy,
    remarks: `EDE request ${request.decisionCategory} via ${request.triggerSource}`,
  });
  return request;
}

/**
 * Full advisory cycle. Never executes workflows, notifications, stage changes, or task creation.
 */
export function evaluateEdeDecision(input: {
  decisionCategory?: EdeDecisionCategory;
  /** @deprecated Use decisionCategory. */
  decisionType?: EdeDecisionType | string;
  opportunityId?: string;
  contextInput?: EdeContextCollectionInput;
  triggerSource?: EdeTriggerSource;
  requestedBy: string;
  reason?: string;
}): {
  request: EdeDecisionRequest;
  response: EdeDecisionResponse;
  history: EdeDecisionHistoryEntry;
  chanakya: ReturnType<typeof presentEdeDecisionViaChanakya>;
} {
  const request = createEdeDecisionRequest(input);
  const context =
    request.context ??
    collectEdeDecisionContext(input.contextInput ?? { opportunityId: input.opportunityId });

  initializeDkfFrameworkScaffold(input.requestedBy);
  const knowledgeTrace = evaluateDkfKnowledge(request.decisionCategory, context);

  const { profile, source } = resolveEdeEvaluationProfile(request.decisionCategory);
  const evaluated = evaluateEdeAgainstProfile(request.decisionCategory, context, profile);
  const composed = composeDkfRecommendationFromKnowledge(
    knowledgeTrace,
    evaluated.recommendation,
    evaluated.suggestedNextSteps,
  );

  const reasoned = runEnterpriseReasoningEngine({
    request,
    decisionId: request.decisionId,
    context,
    knowledgeTrace,
    baseRecommendation: composed.recommendation,
    baseNextSteps: composed.nextSteps,
    baseExplanation: [
      evaluated.explanation,
      composed.explanationSuffix,
      knowledgeTrace.evidence.missingInformation.length
        ? `Missing information: ${knowledgeTrace.evidence.missingInformation.join("; ")}.`
        : null,
      knowledgeTrace.evidence.riskFactors.length
        ? `Risk factors: ${knowledgeTrace.evidence.riskFactors.join("; ")}.`
        : null,
    ]
      .filter(Boolean)
      .join(" "),
    actorId: input.requestedBy,
  });

  const response: EdeDecisionResponse = {
    decisionId: request.decisionId,
    requestId: request.id,
    decisionCategory: request.decisionCategory,
    decisionType: request.decisionCategory,
    summary: evaluated.summary,
    recommendation: reasoned.recommendation,
    recommendationCategory: evaluated.recommendationCategory,
    confidence: evaluated.confidence,
    confidenceBand: evaluated.confidenceBand,
    explanation: reasoned.explanation,
    supportingFactors: evaluated.supportingFactors,
    suggestedNextSteps: reasoned.nextSteps,
    advisoryLevel: evaluated.advisoryLevel,
    advisoryLevelNumber: evaluated.advisoryLevelNumber,
    mayBlockProgression: evaluated.mayBlockProgression,
    executable: false,
    generatedBy: "Enterprise Decision Engine",
    actorId: input.requestedBy,
    opportunityId: request.opportunityId,
    contextSnapshot: context,
    profileSource: source,
    knowledgeUsed: knowledgeTrace.matchedPackages.map((p) => ({
      knowledgeId: p.knowledgeId,
      name: p.name,
      category: p.category,
      version: p.version,
    })),
    evidence: knowledgeTrace.evidence,
    knowledgeTrace,
    reasoningTraceId: reasoned.trace.traceId,
    reasoningTrace: reasoned.trace,
    reasoningChain: reasoned.trace.chain,
    explainability: reasoned.trace.explainability,
    timestamp: new Date().toISOString(),
  };

  getEdePorts().responses.save(response);
  recordEdeAudit({
    entityId: response.decisionId,
    entityType: "response",
    action: "created",
    actorId: input.requestedBy,
    remarks: `EDE ${response.decisionCategory} L${response.advisoryLevelNumber} confidence=${response.confidence}`,
  });

  const now = response.timestamp;
  const history: EdeDecisionHistoryEntry = {
    id: crypto.randomUUID(),
    decisionId: response.decisionId,
    requestId: request.id,
    decisionCategory: response.decisionCategory,
    decisionType: response.decisionCategory,
    actorId: input.requestedBy,
    opportunityId: response.opportunityId,
    contextSummary: [
      context.opportunityCode ?? context.opportunityId,
      context.stageCode,
      context.customerName,
      `health=${context.healthScore ?? "—"}`,
      `level=${response.advisoryLevel}`,
    ]
      .filter(Boolean)
      .join(" · "),
    context,
    recommendation: response.recommendation,
    confidence: response.confidence,
    explanation: response.explanation,
    advisoryLevel: response.advisoryLevel,
    userAction: "pending",
    finalOutcome: "open",
    occurredOn: now,
    modifiedOn: now,
  };
  getEdePorts().history.save(history);
  recordEdeAudit({
    entityId: history.id,
    entityType: "history",
    action: "created",
    actorId: input.requestedBy,
    remarks: `EDE history ${history.decisionId}`,
  });

  publishEdeDecisionToDialogue(response);
  const chanakya = presentEdeDecisionViaChanakya(response);
  maybeIngestEdeResponse(response, input.requestedBy);

  return { request, response, history, chanakya };
}

/** Record user action / override / outcome — EDE never forces the action. */
export function recordEdeUserDecisionAction(input: {
  decisionId: string;
  userAction: EdeUserAction;
  actorId: string;
  overrideReason?: string;
  finalOutcome?: EdeFinalOutcome;
}): EdeDecisionHistoryEntry {
  const existing = getEdePorts().history.list().find((h) => h.decisionId === input.decisionId);
  if (!existing) throw new Error("EDE history entry not found for decision");

  const outcome: EdeFinalOutcome =
    input.finalOutcome ??
    (input.userAction === "overridden"
      ? "overridden"
      : input.userAction === "accepted"
        ? "followed"
        : input.userAction === "closed"
          ? "closed"
          : existing.finalOutcome);

  const updated: EdeDecisionHistoryEntry = {
    ...existing,
    userAction: input.userAction,
    overrideReason: input.overrideReason ?? existing.overrideReason,
    finalOutcome: outcome,
    modifiedOn: new Date().toISOString(),
  };
  getEdePorts().history.save(updated);
  recordEdeAudit({
    entityId: updated.id,
    entityType: "history",
    action: "modified",
    actorId: input.actorId,
    remarks: `EDE user action ${input.userAction} outcome=${outcome}`,
  });
  return updated;
}

export function listEdeDecisionHistory(opportunityId?: string): EdeDecisionHistoryEntry[] {
  const rows = opportunityId
    ? getEdePorts().history.listByOpportunity(opportunityId)
    : getEdePorts().history.list();
  return [...rows].sort(
    (a, b) => new Date(b.occurredOn).getTime() - new Date(a.occurredOn).getTime(),
  );
}

export function listEdeDecisionResponses(opportunityId?: string): EdeDecisionResponse[] {
  const rows = opportunityId
    ? getEdePorts().responses.listByOpportunity(opportunityId)
    : getEdePorts().responses.list();
  return [...rows].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

export function getEdeDecision(decisionId: string): EdeDecisionResponse | undefined {
  return getEdePorts().responses.findById(decisionId);
}
