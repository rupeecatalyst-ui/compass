/**
 * CHANAKYA executive advisor presentation for EAC.
 * Professional business language only. Never issues commands.
 */

import type {
  EacAdvisoryCard,
  EacChanakyaExecutivePresentation,
} from "@/types/enterprise-advisory-console";
import { getEacOrchestrationConfig } from "./config";

export function presentEacViaChanakya(
  card: EacAdvisoryCard,
): EacChanakyaExecutivePresentation | null {
  if (!getEacOrchestrationConfig().presentViaChanakya) return null;

  const evidence =
    card.supportingEvidence.length > 0
      ? card.supportingEvidence
      : card.explainability?.highestImpactEvidence ??
        card.explainability?.strongestEvidence ??
        [];

  return {
    advisoryId: card.advisoryId,
    executiveSummary: `${card.recommendationType.replace(/_/g, " ")} advisory for ${
      card.customerName ?? "the customer"
    }${card.opportunityCode ? ` · ${card.opportunityCode}` : ""}.`,
    businessContext: [
      card.productRef ? `Product context: ${card.productRef}` : null,
      card.assignedRmLabel ? `RM: ${card.assignedRmLabel}` : null,
      `Advisory level ${card.advisoryLevelNumber} (${card.advisoryLevel.replace(/_/g, " ")})`,
      `Priority ${card.priority}`,
      card.reasoningTraceId ? `Reasoning trace ${card.reasoningTraceId.slice(0, 8)}…` : null,
    ]
      .filter(Boolean)
      .join(". "),
    recommendation: card.recommendation,
    explanation:
      card.explainability?.why ??
      card.reasoningSummary ??
      "Advisory guidance based on enterprise knowledge and reasoned evidence.",
    supportingEvidence: evidence.slice(0, 5),
    suggestedNextStep:
      card.explainability?.suggestedNextStep ??
      card.suggestedNextSteps[0] ??
      "Review the advisory details and decide consciously.",
    tone: "professional_business",
    generatedBy: "CHANAKYA",
    neverCommands: true,
  };
}
