/**
 * EEI experience registry — history only. No automatic knowledge or policy updates.
 */

import type { EacAdvisoryCard, EacLifecycleState } from "@/types/enterprise-advisory-console";
import type {
  EeiBusinessOutcome,
  EeiBusinessValue,
  EeiExperienceRecord,
  EeiRecommendationOutcome,
  EeiTimelineEntry,
} from "@/types/enterprise-experience-intelligence";
import { getEdeDecision } from "@/lib/enterprise-decision-engine/decision-registry";
import { recordEeiAudit } from "./audit-integration";
import { getEeiPorts } from "./composition";
import { getEeiOrchestrationConfig } from "./config";
import { publishEeiEventToDialogue } from "./dialogue-integration";
import { ensureEeiKnowledgeFeedback } from "./knowledge-feedback";
import { withRefreshedValueTraceability } from "./value-traceability";

function appendTimeline(
  experience: EeiExperienceRecord,
  eventType: EeiTimelineEntry["eventType"],
  label: string,
  actorId: string,
  detail?: string,
): EeiExperienceRecord {
  const entry: EeiTimelineEntry = {
    entryId: crypto.randomUUID(),
    experienceId: experience.experienceId,
    eventType,
    label,
    detail,
    actorId,
    occurredOn: new Date().toISOString(),
  };
  return {
    ...experience,
    timeline: [entry, ...experience.timeline],
    modifiedOn: entry.occurredOn,
  };
}

function persist(experience: EeiExperienceRecord): EeiExperienceRecord {
  const withTrace = withRefreshedValueTraceability(experience);
  ensureEeiKnowledgeFeedback(withTrace);
  getEeiPorts().experiences.save(withTrace);
  return withTrace;
}

function resolveReasoningProfileId(decisionId?: string): string | undefined {
  if (!decisionId) return undefined;
  try {
    return getEdeDecision(decisionId)?.reasoningTrace?.reasoningProfileId;
  } catch {
    return undefined;
  }
}

function mapLifecycleToRecommendationOutcome(
  state: EacLifecycleState,
): EeiRecommendationOutcome | null {
  switch (state) {
    case "accepted":
      return "accepted";
    case "deferred":
      return "deferred";
    case "overridden":
      return "overridden";
    case "completed":
      return "completed";
    case "dismissed":
      return "rejected";
    default:
      return null;
  }
}

function dialogueTitleForOutcome(
  outcome: EeiRecommendationOutcome,
):
  | "Recommendation Accepted"
  | "Recommendation Rejected"
  | "Recommendation Overridden"
  | "Recommendation Deferred"
  | "Recommendation Completed" {
  switch (outcome) {
    case "accepted":
      return "Recommendation Accepted";
    case "rejected":
    case "cancelled":
    case "expired":
      return "Recommendation Rejected";
    case "overridden":
      return "Recommendation Overridden";
    case "deferred":
      return "Recommendation Deferred";
    case "completed":
      return "Recommendation Completed";
  }
}

export function createEeiExperienceFromAdvisory(
  card: EacAdvisoryCard,
  actorId: string,
): EeiExperienceRecord {
  const now = new Date().toISOString();
  const reasoningProfileId = resolveReasoningProfileId(card.decisionId);
  const decisionTraceId = card.reasoningTraceId ?? card.decisionId;

  let record: EeiExperienceRecord = {
    experienceId: crypto.randomUUID(),
    decisionId: card.decisionId,
    advisoryId: card.advisoryId,
    opportunityId: card.opportunityId,
    opportunityCode: card.opportunityCode,
    recommendation: card.recommendation,
    advisoryLevel: card.advisoryLevel,
    userId: actorId,
    timestamp: now,
    recommendationOutcome: null,
    recommendationOutcomeHistory: [],
    businessOutcome: "not_recorded",
    businessOutcomeHistory: [],
    businessValues: ["not_recorded"],
    businessValueHistory: [],
    valueTraceability: {
      recommendationIssued: card.recommendation,
      userWhoActed: null,
      actionTaken: null,
      businessOutcomeOccurred: "not_recorded",
      businessValueCreated: [],
      knowledgePackagesContributed: card.knowledgePackagesUsed,
      reasoningProfileId: reasoningProfileId ?? null,
      decisionTraceId: decisionTraceId ?? null,
      establishedOn: now,
    },
    finalStatus: "open",
    knowledgePackageIds: card.knowledgePackagesUsed.map((k) => k.knowledgeId),
    knowledgePackages: card.knowledgePackagesUsed,
    decisionTraceId,
    reasoningTraceId: card.reasoningTraceId,
    reasoningProfileId,
    timeline: [],
    generatedBy: "Enterprise Experience Intelligence",
    executable: false,
    autoBehaviourChange: false,
    neverAutoModifiesEnterpriseConfig: true,
    createdOn: now,
    modifiedOn: now,
  };

  record = appendTimeline(
    record,
    "recommendation_issued",
    "Recommendation",
    actorId,
    card.recommendation.slice(0, 200),
  );
  record = appendTimeline(
    record,
    "experience_recorded",
    "Experience Record",
    actorId,
    `Experience ${record.experienceId.slice(0, 8)}… opened · value traceability established`,
  );

  record = persist(record);
  recordEeiAudit({
    entityId: record.experienceId,
    entityType: "experience",
    action: "created",
    actorId,
    remarks: `EEI experience for advisory ${card.advisoryId}`,
  });
  publishEeiEventToDialogue({
    experience: record,
    title: "Experience Recorded",
    actorId,
  });
  return record;
}

export function maybeCreateEeiFromAdvisory(
  card: EacAdvisoryCard,
  actorId: string,
): EeiExperienceRecord | null {
  if (!getEeiOrchestrationConfig().autoCreateFromAdvisory) return null;
  const existing = getEeiPorts().experiences.findByAdvisoryId(card.advisoryId);
  if (existing) return existing;
  return createEeiExperienceFromAdvisory(card, actorId);
}

export function getEeiExperience(experienceId: string): EeiExperienceRecord | undefined {
  return getEeiPorts().experiences.findById(experienceId);
}

export function getEeiExperienceByAdvisory(
  advisoryId: string,
): EeiExperienceRecord | undefined {
  return getEeiPorts().experiences.findByAdvisoryId(advisoryId);
}

export function listEeiExperiences(opportunityId?: string): EeiExperienceRecord[] {
  const rows = opportunityId
    ? getEeiPorts().experiences.listByOpportunity(opportunityId)
    : getEeiPorts().experiences.list();
  return [...rows].sort(
    (a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime(),
  );
}

export function recordEeiRecommendationOutcome(input: {
  experienceId?: string;
  advisoryId?: string;
  outcome: EeiRecommendationOutcome;
  actorId: string;
  remarks?: string;
}): EeiExperienceRecord {
  const existing =
    (input.experienceId ? getEeiExperience(input.experienceId) : undefined) ??
    (input.advisoryId ? getEeiExperienceByAdvisory(input.advisoryId) : undefined);
  if (!existing) throw new Error("EEI experience not found");

  const now = new Date().toISOString();
  let updated: EeiExperienceRecord = {
    ...existing,
    recommendationOutcome: input.outcome,
    recommendationOutcomeHistory: [
      {
        outcome: input.outcome,
        actorId: input.actorId,
        remarks: input.remarks,
        recordedOn: now,
      },
      ...existing.recommendationOutcomeHistory,
    ],
    finalStatus: existing.finalStatus === "closed" ? "closed" : "in_progress",
    modifiedOn: now,
  };

  updated = appendTimeline(
    updated,
    "user_action",
    "User Action",
    input.actorId,
    `${input.outcome}${input.remarks ? ` — ${input.remarks}` : ""}`,
  );

  updated = persist(updated);
  recordEeiAudit({
    entityId: updated.experienceId,
    entityType: "experience",
    action: "modified",
    actorId: input.actorId,
    remarks: `EEI recommendation outcome ${input.outcome}`,
  });
  publishEeiEventToDialogue({
    experience: updated,
    title: dialogueTitleForOutcome(input.outcome),
    actorId: input.actorId,
    recommendationOutcome: input.outcome,
  });
  return updated;
}

export function syncEeiFromAdvisoryLifecycle(
  card: EacAdvisoryCard,
  state: EacLifecycleState,
  actorId: string,
  remarks?: string,
): EeiExperienceRecord | null {
  maybeCreateEeiFromAdvisory(card, actorId);
  const outcome = mapLifecycleToRecommendationOutcome(state);
  if (!outcome) return getEeiExperienceByAdvisory(card.advisoryId) ?? null;
  return recordEeiRecommendationOutcome({
    advisoryId: card.advisoryId,
    outcome,
    actorId,
    remarks,
  });
}

export function recordEeiBusinessOutcome(input: {
  experienceId?: string;
  advisoryId?: string;
  outcome: EeiBusinessOutcome;
  actorId: string;
  remarks?: string;
}): EeiExperienceRecord {
  const existing =
    (input.experienceId ? getEeiExperience(input.experienceId) : undefined) ??
    (input.advisoryId ? getEeiExperienceByAdvisory(input.advisoryId) : undefined);
  if (!existing) throw new Error("EEI experience not found");

  const now = new Date().toISOString();
  let updated: EeiExperienceRecord = {
    ...existing,
    businessOutcome: input.outcome,
    businessOutcomeHistory: [
      {
        outcome: input.outcome,
        actorId: input.actorId,
        remarks: input.remarks,
        recordedOn: now,
      },
      ...existing.businessOutcomeHistory,
    ],
    finalStatus: existing.finalStatus === "closed" ? "closed" : "in_progress",
    modifiedOn: now,
  };

  updated = appendTimeline(
    updated,
    "business_outcome",
    "Business Outcome",
    input.actorId,
    `${input.outcome.replace(/_/g, " ")}${input.remarks ? ` — ${input.remarks}` : ""}`,
  );

  updated = persist(updated);
  recordEeiAudit({
    entityId: updated.experienceId,
    entityType: "experience",
    action: "modified",
    actorId: input.actorId,
    remarks: `EEI business outcome ${input.outcome}`,
  });
  publishEeiEventToDialogue({
    experience: updated,
    title: "Business Outcome Recorded",
    actorId: input.actorId,
    businessOutcome: input.outcome,
  });
  return updated;
}

/** Record descriptive business value(s) — no scores, no analytics. */
export function recordEeiBusinessValue(input: {
  experienceId?: string;
  advisoryId?: string;
  values: EeiBusinessValue[];
  actorId: string;
  remarks?: string;
}): EeiExperienceRecord {
  const existing =
    (input.experienceId ? getEeiExperience(input.experienceId) : undefined) ??
    (input.advisoryId ? getEeiExperienceByAdvisory(input.advisoryId) : undefined);
  if (!existing) throw new Error("EEI experience not found");

  const cleaned = input.values.filter((v) => v !== "not_recorded");
  const values: EeiBusinessValue[] = cleaned.length ? cleaned : ["not_recorded"];
  const now = new Date().toISOString();
  let updated: EeiExperienceRecord = {
    ...existing,
    businessValues: values,
    businessValueHistory: [
      {
        values,
        actorId: input.actorId,
        remarks: input.remarks,
        recordedOn: now,
      },
      ...existing.businessValueHistory,
    ],
    finalStatus: existing.finalStatus === "closed" ? "closed" : "in_progress",
    modifiedOn: now,
  };

  updated = appendTimeline(
    updated,
    "business_value",
    "Business Value",
    input.actorId,
    `${values.map((v) => v.replace(/_/g, " ")).join("; ")}${
      input.remarks ? ` — ${input.remarks}` : ""
    }`,
  );

  updated = persist(updated);
  recordEeiAudit({
    entityId: updated.experienceId,
    entityType: "experience",
    action: "modified",
    actorId: input.actorId,
    remarks: "EEI business value recorded (descriptive only)",
  });
  publishEeiEventToDialogue({
    experience: updated,
    title: "Business Outcome Recorded",
    actorId: input.actorId,
  });
  return updated;
}

export function closeEeiExperience(input: {
  experienceId?: string;
  advisoryId?: string;
  actorId: string;
  remarks?: string;
}): EeiExperienceRecord {
  const existing =
    (input.experienceId ? getEeiExperience(input.experienceId) : undefined) ??
    (input.advisoryId ? getEeiExperienceByAdvisory(input.advisoryId) : undefined);
  if (!existing) throw new Error("EEI experience not found");

  const now = new Date().toISOString();
  let updated: EeiExperienceRecord = {
    ...existing,
    finalStatus: "closed",
    closedOn: now,
    modifiedOn: now,
  };
  updated = appendTimeline(
    updated,
    "final_status",
    "Final Status",
    input.actorId,
    `closed${input.remarks ? ` — ${input.remarks}` : ""}`,
  );
  updated = appendTimeline(
    updated,
    "experience_closed",
    "Experience Record",
    input.actorId,
    "Experience closed — no automatic knowledge, profile, weighting, workflow, or policy updates",
  );

  updated = persist(updated);
  recordEeiAudit({
    entityId: updated.experienceId,
    entityType: "experience",
    action: "lifecycle_changed",
    actorId: input.actorId,
    remarks: "EEI experience closed",
  });
  publishEeiEventToDialogue({
    experience: updated,
    title: "Experience Closed",
    actorId: input.actorId,
  });
  return updated;
}

export function expireEeiExperience(
  experienceId: string,
  actorId: string,
  remarks?: string,
): EeiExperienceRecord {
  const updated = recordEeiRecommendationOutcome({
    experienceId,
    outcome: "expired",
    actorId,
    remarks,
  });
  return closeEeiExperience({
    experienceId: updated.experienceId,
    actorId,
    remarks: remarks ?? "Expired",
  });
}
