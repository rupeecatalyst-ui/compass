/**
 * Customer Readiness assessment (CO-AI-109) — recommendation only.
 */

import type { EaiConsultationObject } from "@/types/enterprise-ai-consultation";
import type { EaiReadinessAssessment } from "@/types/enterprise-ai-lead-intelligence";
import { bandFromScore, consultationSignals } from "./readiness-helpers";

export function assessEaiCustomerReadiness(
  consultation?: EaiConsultationObject,
): EaiReadinessAssessment {
  const s = consultationSignals(consultation);
  let score = 20;
  const reasons: string[] = [];
  const blockers: string[] = [];

  if (s.objectives.length > 0) {
    score += 20;
    reasons.push("Clear customer objective");
  } else blockers.push("Objective unclear");

  if (s.facts.length >= 2) {
    score += 20;
    reasons.push("Multiple key facts captured");
  } else blockers.push("Insufficient customer facts");

  if (s.concerns.length > 0) {
    score += 10;
    reasons.push("Financial concerns acknowledged");
  }

  if (s.missingUnknown.length === 0) {
    score += 20;
    reasons.push("No unknown information slots");
  } else if (s.missingUnknown.length <= 2) {
    score += 10;
    reasons.push("Few remaining gaps");
  } else {
    blockers.push("Multiple customer information gaps remain");
  }

  if (consultation?.confidence.band === "high" || consultation?.confidence.band === "moderate") {
    score += 10;
    reasons.push("Consultation confidence supportive");
  }

  score = Math.max(0, Math.min(100, score));
  const band = bandFromScore(score);

  return {
    dimension: "customer",
    score,
    band,
    reasons,
    blockers,
    recommendedNextStep:
      band === "ready" || band === "strong"
        ? "Customer ready for recommended next proposals"
        : "Continue clarifying customer facts before CRM proposals",
  };
}
