/**
 * EEI → Dialogue Center.
 */

import { appendEdcTimelineEntry } from "@/lib/enterprise-dialogue-center";
import type {
  EeiBusinessOutcome,
  EeiExperienceRecord,
  EeiRecommendationOutcome,
} from "@/types/enterprise-experience-intelligence";
import { getEeiOrchestrationConfig } from "./config";

export function publishEeiEventToDialogue(input: {
  experience: EeiExperienceRecord;
  title:
    | "Recommendation Accepted"
    | "Recommendation Rejected"
    | "Recommendation Overridden"
    | "Recommendation Deferred"
    | "Recommendation Completed"
    | "Business Outcome Recorded"
    | "Experience Closed"
    | "Experience Recorded";
  actorId: string;
  recommendationOutcome?: EeiRecommendationOutcome | null;
  businessOutcome?: EeiBusinessOutcome;
}): void {
  const config = getEeiOrchestrationConfig();
  if (!config.autoPublishDialogue) return;
  if (!input.experience.opportunityId) return;

  appendEdcTimelineEntry({
    contextRef: { type: "opportunity", id: input.experience.opportunityId },
    eventType: "workflow",
    title: input.title,
    description: `${input.experience.recommendation.slice(0, 140)} · Experience ${input.experience.experienceId.slice(0, 8)}…`,
    actorId: input.actorId,
    occurredOn: new Date().toISOString(),
    expandablePayload: {
      generatedBy: "Enterprise Experience Intelligence",
      experienceId: input.experience.experienceId,
      decisionId: input.experience.decisionId,
      advisoryId: input.experience.advisoryId,
      recommendation: input.experience.recommendation,
      recommendationOutcome:
        input.recommendationOutcome ?? input.experience.recommendationOutcome,
      businessOutcome: input.businessOutcome ?? input.experience.businessOutcome,
      businessValues: input.experience.businessValues,
      valueTraceability: input.experience.valueTraceability,
      knowledgePackages: input.experience.knowledgePackages.map((k) => k.name),
      reasoningProfileId: input.experience.reasoningProfileId,
      reasoningTraceId: input.experience.reasoningTraceId,
      decisionTraceId: input.experience.decisionTraceId,
      finalStatus: input.experience.finalStatus,
      executable: false,
      autoBehaviourChange: false,
      neverAutoModifiesEnterpriseConfig: true,
    },
  });
}
