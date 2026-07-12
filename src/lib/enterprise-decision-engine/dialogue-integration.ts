/**
 * EDE / ERE → Dialogue Center (advisory entries only).
 */

import { appendEdcTimelineEntry } from "@/lib/enterprise-dialogue-center";
import type { EdeDecisionResponse } from "@/types/enterprise-decision-engine";
import { getEdeOrchestrationConfig } from "./config";

export function publishEdeDecisionToDialogue(response: EdeDecisionResponse): void {
  const config = getEdeOrchestrationConfig();
  if (!config.autoPublishDialogue) return;
  if (!response.opportunityId) return;

  const knowledgeUsed = response.knowledgeUsed.map((k) => k.name);
  const evidenceUsed =
    response.reasoningTrace?.evidenceUsed.map((e) => e.label) ??
    response.evidence.evidenceUsed;
  const traceId = response.reasoningTraceId ?? response.reasoningTrace?.traceId ?? "—";

  appendEdcTimelineEntry({
    contextRef: { type: "opportunity", id: response.opportunityId },
    eventType: "workflow",
    title: `Reasoning completed · ${response.decisionCategory.replace(/_/g, " ")}`,
    description: `Trace ${traceId} · Confidence ${response.confidence}% · ${response.recommendation.slice(0, 160)}`,
    actorId: "ere",
    occurredOn: response.timestamp,
    expandablePayload: {
      generatedBy: "Enterprise Reasoning Engine",
      reasoningTraceId: traceId,
      recommendation: response.recommendation,
      confidence: response.confidence,
      knowledgeUsed,
      evidenceUsed,
      decisionId: response.decisionId,
      decisionCategory: response.decisionCategory,
      explanation: response.explanation,
      missingEvidence: response.reasoningTrace?.missingEvidence ?? response.evidence.missingInformation,
      conflicts: response.reasoningTrace?.conflicts,
      reasoningChain: response.reasoningChain,
      reasoningTrace: response.reasoningTrace,
      explainability: response.explainability,
      suggestedNextSteps: response.suggestedNextSteps,
      advisoryLevel: response.advisoryLevel,
      mayBlockProgression: response.mayBlockProgression,
      executable: false,
    },
  });
}
