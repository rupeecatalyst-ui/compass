/**
 * Document Readiness assessment (CO-AI-109) — recommendation only.
 */

import type { EaiConsultationObject } from "@/types/enterprise-ai-consultation";
import type { EaiReadinessAssessment } from "@/types/enterprise-ai-lead-intelligence";
import { bandFromScore, consultationSignals } from "./readiness-helpers";

export function assessEaiDocumentReadiness(
  consultation?: EaiConsultationObject,
): EaiReadinessAssessment {
  const s = consultationSignals(consultation);
  let score = 25;
  const reasons: string[] = [];
  const blockers: string[] = [];

  if (s.hasDocsReady) {
    score += 45;
    reasons.push("Documents indicated ready in consultation facts");
  } else if (s.docsGap) {
    score -= 5;
    blockers.push("Document readiness slot still open");
  } else {
    blockers.push("Document status not confirmed");
  }

  if (s.concerns.some((c) => c.category === "documents")) {
    score -= 10;
    blockers.push("Customer expressed document concerns");
  }

  if (s.isCompletedLike) {
    score += 15;
    reasons.push("Consultation structured enough to assess documents");
  }

  if (!s.docsGap && s.facts.length >= 2) {
    score += 10;
    reasons.push("No active document gap flagged");
  }

  score = Math.max(0, Math.min(100, score));
  const band = bandFromScore(score);

  return {
    dimension: "document",
    score,
    band,
    reasons,
    blockers,
    recommendedNextStep:
      band === "not_ready" || band === "partial"
        ? "Propose request_documents for human review"
        : "Documents appear ready — no document proposal required",
  };
}
