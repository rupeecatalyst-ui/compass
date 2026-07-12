/**
 * CHANAKYA presentation — communicates EDE recommendations in professional business language.
 * Never issues commands. Never executes.
 */

import type {
  EdeChanakyaPresentation,
  EdeDecisionResponse,
} from "@/types/enterprise-decision-engine";
import { getEdeOrchestrationConfig } from "./config";

export function presentEdeDecisionViaChanakya(
  response: EdeDecisionResponse,
): EdeChanakyaPresentation | null {
  const config = getEdeOrchestrationConfig();
  if (!config.presentViaChanakya) return null;

  const severity =
    response.advisoryLevel === "compliance_block" || response.advisoryLevel === "escalation"
      ? "attention"
      : response.advisoryLevel === "warning" || response.advisoryLevel === "recommendation"
        ? "advisory"
        : "info";

  const nextHint = response.suggestedNextSteps[0]
    ? ` Suggested next step: ${response.suggestedNextSteps[0]}`
    : "";

  return {
    decisionId: response.decisionId,
    headline: response.summary,
    message: `${response.recommendation} Confidence ${response.confidence}%.${nextHint}`,
    confidence: response.confidence,
    advisoryLevel: response.advisoryLevel,
    nextSteps: response.suggestedNextSteps,
    knowledgeNames: response.knowledgeUsed.map((k) => k.name),
    severity,
    generatedBy: "CHANAKYA",
    sourceEngine: "EDE",
    tone: "professional_business",
  };
}
