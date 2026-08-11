/**
 * Consultation Confidence (CO-AI-108).
 * Evidence completeness only — never FOIR/eligibility math.
 */

import type { EaiConfidenceBand } from "@/types/enterprise-ai-platform";
import type {
  EaiConsultationConfidence,
  EaiConsultationKeyFact,
  EaiConsultationObjective,
} from "@/types/enterprise-ai-consultation";
import type { EaiPlannerMissingInfo } from "@/types/enterprise-ai-planner";

export function assessEaiConsultationConfidence(input: {
  keyFacts: EaiConsultationKeyFact[];
  objectives: EaiConsultationObjective[];
  missing: EaiPlannerMissingInfo[];
  blocked?: boolean;
}): EaiConsultationConfidence {
  if (input.blocked) {
    return {
      band: "high",
      scoreHint: 100,
      reasons: ["Outside domain refusal is definitive"],
      evidenceFactCount: 0,
      missingSlotCount: 0,
    };
  }

  const missingUnknown = input.missing.filter((m) => !m.alreadyKnown).length;
  const factScore = Math.min(50, input.keyFacts.length * 12);
  const objectiveScore = input.objectives.length > 0 ? 20 : 0;
  const gapPenalty = Math.min(40, missingUnknown * 10);
  const scoreHint = Math.max(0, Math.min(100, factScore + objectiveScore + 20 - gapPenalty));

  let band: EaiConfidenceBand = "low";
  if (scoreHint >= 75) band = "high";
  else if (scoreHint >= 45) band = "moderate";
  else if (scoreHint === 0) band = "unspecified";

  const reasons: string[] = [];
  reasons.push(`${input.keyFacts.length} key fact(s) extracted`);
  reasons.push(`${input.objectives.length} objective(s) identified`);
  reasons.push(`${missingUnknown} unknown information slot(s)`);
  reasons.push("Confidence reflects evidence completeness — not credit approval");

  return {
    band,
    scoreHint,
    reasons,
    evidenceFactCount: input.keyFacts.length,
    missingSlotCount: missingUnknown,
  };
}
