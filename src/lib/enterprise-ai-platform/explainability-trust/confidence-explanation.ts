/**
 * Confidence explanation (CO-AI-110).
 * Never hides uncertainty.
 */

import type { EaiLeadIntelligenceResult } from "@/types/enterprise-ai-lead-intelligence";
import type { EaiConsultationObject } from "@/types/enterprise-ai-consultation";
import type {
  EaiConfidenceExplanation,
  EaiTrustReasonCode,
} from "@/types/enterprise-ai-explainability";

export function explainEaiTrustConfidence(input: {
  blocked?: boolean;
  leadIntelligence?: EaiLeadIntelligenceResult;
  consultation?: EaiConsultationObject;
  reasonCodes: EaiTrustReasonCode[];
}): EaiConfidenceExplanation {
  if (input.blocked) {
    return {
      band: "high",
      scoreHint: 100,
      explanationLines: ["Outside-domain refusal confidence is definitive."],
      uncertaintyLines: ["No in-domain recommendation confidence applies."],
      reasonCodes: ["RC_OUTSIDE_DOMAIN"],
    };
  }

  const li = input.leadIntelligence;
  const band = li?.confidence.band ?? input.consultation?.confidence.band ?? "unspecified";
  const scoreHint = li?.confidence.scoreHint ?? input.consultation?.confidence.scoreHint ?? 0;

  const explanationLines: string[] = [
    `Confidence band is ${band} (score hint ${scoreHint}).`,
    "This measures evidence completeness for recommendations — not credit approval.",
  ];

  const uncertaintyLines: string[] = [];
  const unknownGaps = (input.consultation?.missingInformation ?? []).filter((m) => !m.alreadyKnown);

  if (unknownGaps.length > 0) {
    uncertaintyLines.push(`${unknownGaps.length} information gap(s) remain unresolved.`);
  }
  if (band === "low" || band === "unspecified") {
    uncertaintyLines.push("Evidence is limited — treat recommendations as provisional.");
  }
  if (band === "moderate") {
    uncertaintyLines.push("Moderate confidence — verify facts before acting on proposals.");
  }
  if (input.reasonCodes.some((r) => r.code === "RC_ENGINE_DECISION_REQUIRED")) {
    uncertaintyLines.push("Engine calculations (eligibility/FOIR/pricing) are not yet available.");
  }
  if (uncertaintyLines.length === 0) {
    uncertaintyLines.push("Residual uncertainty remains until human review and engine confirmation.");
  }

  const reasonCodes = input.reasonCodes
    .filter((r) =>
      ["RC_LOW_EVIDENCE", "RC_MODERATE_EVIDENCE", "RC_HIGH_EVIDENCE", "RC_INFORMATION_GAPS"].includes(
        r.code,
      ),
    )
    .map((r) => r.code);

  return {
    band,
    scoreHint,
    explanationLines,
    uncertaintyLines,
    reasonCodes:
      reasonCodes.length > 0
        ? reasonCodes
        : band === "high"
          ? ["RC_HIGH_EVIDENCE"]
          : band === "moderate"
            ? ["RC_MODERATE_EVIDENCE"]
            : ["RC_LOW_EVIDENCE"],
  };
}
