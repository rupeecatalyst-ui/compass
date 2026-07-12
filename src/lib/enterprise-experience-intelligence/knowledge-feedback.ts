/**
 * EEI Knowledge Feedback architecture.
 * References knowledge package + reasoning profile + recommendation + outcome.
 * Administrators may later refine knowledge — never automatic updates.
 */

import type {
  EeiExperienceRecord,
  EeiKnowledgeFeedbackRef,
} from "@/types/enterprise-experience-intelligence";
import { recordEeiAudit } from "./audit-integration";
import { getEeiPorts } from "./composition";

export function ensureEeiKnowledgeFeedback(
  experience: EeiExperienceRecord,
): EeiKnowledgeFeedbackRef {
  const existing = experience.knowledgeFeedbackId
    ? getEeiPorts().knowledgeFeedback.findById(experience.knowledgeFeedbackId)
    : getEeiPorts().knowledgeFeedback.listByExperience(experience.experienceId)[0];

  const feedback: EeiKnowledgeFeedbackRef = {
    feedbackId: existing?.feedbackId ?? crypto.randomUUID(),
    experienceId: experience.experienceId,
    knowledgePackageIds: experience.knowledgePackageIds,
    knowledgePackageNames: experience.knowledgePackages.map((k) => k.name),
    reasoningProfileId: experience.reasoningProfileId,
    recommendation: experience.recommendation,
    recommendationOutcome: experience.recommendationOutcome,
    businessOutcome: experience.businessOutcome,
    businessValues: experience.businessValues,
    refinementSuggested: existing?.refinementSuggested ?? false,
    refinementNotes: existing?.refinementNotes,
    createdOn: existing?.createdOn ?? new Date().toISOString(),
  };

  getEeiPorts().knowledgeFeedback.save(feedback);
  if (!existing) {
    recordEeiAudit({
      entityId: feedback.feedbackId,
      entityType: "knowledge_feedback",
      action: "created",
      actorId: experience.userId,
      remarks: "EEI knowledge feedback ref (no auto-update)",
    });
  }
  return feedback;
}

/** Administrator-only flag — does not change knowledge packages. */
export function markEeiKnowledgeRefinementSuggested(input: {
  feedbackId: string;
  actorId: string;
  notes: string;
}): EeiKnowledgeFeedbackRef {
  const existing = getEeiPorts().knowledgeFeedback.findById(input.feedbackId);
  if (!existing) throw new Error("EEI knowledge feedback not found");
  const updated: EeiKnowledgeFeedbackRef = {
    ...existing,
    refinementSuggested: true,
    refinementNotes: input.notes,
  };
  getEeiPorts().knowledgeFeedback.save(updated);
  recordEeiAudit({
    entityId: updated.feedbackId,
    entityType: "knowledge_feedback",
    action: "modified",
    actorId: input.actorId,
    remarks: "Admin suggested knowledge refinement — not published",
  });
  return updated;
}

export function listEeiKnowledgeFeedback(): EeiKnowledgeFeedbackRef[] {
  return getEeiPorts().knowledgeFeedback.list();
}
