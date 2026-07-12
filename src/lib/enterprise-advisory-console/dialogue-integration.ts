/**
 * EAC → Dialogue Center (lifecycle events only — no execution).
 */

import { appendEdcTimelineEntry } from "@/lib/enterprise-dialogue-center";
import type { EacAdvisoryCard, EacLifecycleState } from "@/types/enterprise-advisory-console";
import { getEacOrchestrationConfig } from "./config";

const TITLES: Record<EacLifecycleState, string> = {
  new: "Recommendation Issued",
  viewed: "Recommendation Viewed",
  accepted: "Recommendation Accepted",
  deferred: "Recommendation Deferred",
  overridden: "Recommendation Overridden",
  completed: "Recommendation Completed",
  dismissed: "Recommendation Dismissed",
};

export function publishEacLifecycleToDialogue(
  card: EacAdvisoryCard,
  state: EacLifecycleState,
  actorId: string,
): void {
  const config = getEacOrchestrationConfig();
  if (!config.autoPublishDialogue) return;
  if (!card.opportunityId) return;

  appendEdcTimelineEntry({
    contextRef: { type: "opportunity", id: card.opportunityId },
    eventType: "workflow",
    title: TITLES[state],
    description: `${card.recommendation.slice(0, 140)} · Confidence ${card.confidence}% · ${card.advisoryId.slice(0, 8)}…`,
    actorId,
    occurredOn: new Date().toISOString(),
    expandablePayload: {
      generatedBy: "Enterprise Advisory Console",
      advisoryId: card.advisoryId,
      lifecycleState: state,
      recommendation: card.recommendation,
      confidence: card.confidence,
      advisoryLevel: card.advisoryLevel,
      priority: card.priority,
      knowledgeUsed: card.knowledgePackagesUsed.map((k) => k.name),
      reasoningTraceId: card.reasoningTraceId,
      override: card.override,
      remarks: card.remarks,
      executable: false,
    },
  });
}
