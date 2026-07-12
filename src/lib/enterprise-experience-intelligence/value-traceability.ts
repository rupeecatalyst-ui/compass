/**
 * EEI Business Value Traceability — permanent enterprise history linkage.
 * Descriptive only. No scores. No analytics. No automatic config changes.
 */

import type {
  EeiBusinessValueTraceability,
  EeiExperienceRecord,
} from "@/types/enterprise-experience-intelligence";

/** Build / refresh the permanent traceability snapshot on an experience. */
export function buildEeiBusinessValueTraceability(
  experience: EeiExperienceRecord,
): EeiBusinessValueTraceability {
  const lastActor =
    experience.recommendationOutcomeHistory[0]?.actorId ??
    experience.businessOutcomeHistory[0]?.actorId ??
    experience.businessValueHistory[0]?.actorId ??
    null;

  return {
    recommendationIssued: experience.recommendation,
    userWhoActed: lastActor,
    actionTaken: experience.recommendationOutcome,
    businessOutcomeOccurred: experience.businessOutcome,
    businessValueCreated: experience.businessValues.filter((v) => v !== "not_recorded"),
    knowledgePackagesContributed: experience.knowledgePackages,
    reasoningProfileId: experience.reasoningProfileId ?? null,
    decisionTraceId:
      experience.decisionTraceId ?? experience.reasoningTraceId ?? experience.decisionId ?? null,
    establishedOn: new Date().toISOString(),
  };
}

export function withRefreshedValueTraceability(
  experience: EeiExperienceRecord,
): EeiExperienceRecord {
  return {
    ...experience,
    valueTraceability: buildEeiBusinessValueTraceability(experience),
  };
}
