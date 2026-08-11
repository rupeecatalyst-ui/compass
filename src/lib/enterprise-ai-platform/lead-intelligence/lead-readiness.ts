/**
 * Lead Readiness assessment (CO-AI-109) — recommendation only.
 */

import type { EaiConsultationObject } from "@/types/enterprise-ai-consultation";
import type { EaiReadinessAssessment } from "@/types/enterprise-ai-lead-intelligence";
import { bandFromScore, consultationSignals } from "./readiness-helpers";

export function assessEaiLeadReadiness(
  consultation?: EaiConsultationObject,
): EaiReadinessAssessment {
  const s = consultationSignals(consultation);
  let score = 20;
  const reasons: string[] = [];
  const blockers: string[] = [];

  if (s.objectives.length > 0) {
    score += 20;
    reasons.push("Customer objective captured");
  } else {
    blockers.push("No customer objective yet");
  }
  if (s.hasProduct) {
    score += 20;
    reasons.push("Product interest known");
  } else {
    blockers.push("Product interest missing");
  }
  if (s.hasAmount) {
    score += 15;
    reasons.push("Required amount known");
  } else {
    blockers.push("Required amount missing");
  }
  if (s.isCompletedLike) {
    score += 15;
    reasons.push("Consultation sufficiently structured");
  } else {
    blockers.push("Consultation not yet complete enough");
  }
  if (s.missingUnknown.length > 3) {
    score -= 10;
    blockers.push("Too many information gaps for lead proposal");
  }

  score = Math.max(0, Math.min(100, score));
  const band = bandFromScore(score);

  return {
    dimension: "lead",
    score,
    band,
    reasons,
    blockers,
    recommendedNextStep:
      band === "ready" || band === "strong"
        ? "Propose create_lead for human review"
        : "Continue consultation to close lead gaps",
  };
}
