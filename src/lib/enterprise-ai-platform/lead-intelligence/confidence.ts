/**
 * Lead Intelligence Confidence (CO-AI-109).
 */

import type { EaiConfidenceBand } from "@/types/enterprise-ai-platform";
import type {
  EaiLeadIntelligenceConfidence,
  EaiReadinessAssessment,
} from "@/types/enterprise-ai-lead-intelligence";
import type { EaiConsultationObject } from "@/types/enterprise-ai-consultation";

export function assessEaiLeadIntelligenceConfidence(input: {
  consultation?: EaiConsultationObject;
  lead: EaiReadinessAssessment;
  opportunity: EaiReadinessAssessment;
  priorityScore: number;
  blocked?: boolean;
}): EaiLeadIntelligenceConfidence {
  if (input.blocked) {
    return {
      band: "high",
      scoreHint: 100,
      reasons: ["Outside domain refusal is definitive"],
    };
  }

  const consultBand = input.consultation?.confidence.band;
  let scoreHint = Math.round(
    (input.lead.score + input.opportunity.score + input.priorityScore) / 3,
  );
  if (consultBand === "high") scoreHint = Math.min(100, scoreHint + 5);
  if (consultBand === "low" || consultBand === "unspecified") scoreHint = Math.max(0, scoreHint - 10);

  let band: EaiConfidenceBand = "low";
  if (scoreHint >= 75) band = "high";
  else if (scoreHint >= 45) band = "moderate";
  else if (scoreHint === 0) band = "unspecified";

  return {
    band,
    scoreHint,
    reasons: [
      `Lead readiness ${input.lead.band} (${input.lead.score})`,
      `Opportunity readiness ${input.opportunity.band} (${input.opportunity.score})`,
      `Priority score ${input.priorityScore}`,
      "Confidence is recommendation quality — not eligibility approval",
    ],
  };
}
