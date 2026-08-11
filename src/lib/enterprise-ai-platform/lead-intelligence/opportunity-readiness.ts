/**
 * Opportunity Readiness assessment (CO-AI-109) — recommendation only.
 */

import type { EaiConsultationObject } from "@/types/enterprise-ai-consultation";
import type { EaiReadinessAssessment } from "@/types/enterprise-ai-lead-intelligence";
import { bandFromScore, consultationSignals } from "./readiness-helpers";

export function assessEaiOpportunityReadiness(
  consultation?: EaiConsultationObject,
): EaiReadinessAssessment {
  const s = consultationSignals(consultation);
  let score = 10;
  const reasons: string[] = [];
  const blockers: string[] = [];

  if (s.hasProduct) {
    score += 25;
    reasons.push("Product identified");
  } else blockers.push("Product not identified");

  if (s.hasAmount) {
    score += 25;
    reasons.push("Amount identified");
  } else blockers.push("Amount not identified");

  if (s.hasEmployment) {
    score += 15;
    reasons.push("Employment context known");
  } else blockers.push("Employment/income context missing");

  if (s.completion >= 70) {
    score += 15;
    reasons.push("High consultation completion");
  } else blockers.push("Consultation completion below opportunity threshold");

  if (s.missingUnknown.some((m) => m.slotId === "required_amount" || m.slotId === "product_interest")) {
    score -= 15;
    blockers.push("Core requirement slots still open");
  }

  score = Math.max(0, Math.min(100, score));
  const band = bandFromScore(score);

  return {
    dimension: "opportunity",
    score,
    band,
    reasons,
    blockers,
    recommendedNextStep:
      band === "ready" || band === "strong"
        ? "Propose create_opportunity for human review"
        : "Capture product + amount before opportunity proposal",
  };
}
