/**
 * Partner Recommendation (CO-AI-109).
 * Qualitative suggestion only — never assigns partners in CRM.
 */

import type { EaiConsultationObject } from "@/types/enterprise-ai-consultation";
import type { EaiPartnerRecommendation } from "@/types/enterprise-ai-lead-intelligence";
import { consultationSignals } from "./readiness-helpers";

function newId(): string {
  return `eai_partner_${crypto.randomUUID().slice(0, 8)}`;
}

export function recommendEaiPartner(
  consultation?: EaiConsultationObject,
): EaiPartnerRecommendation | undefined {
  const s = consultationSignals(consultation);
  const text = [
    ...(s.objectives.map((o) => o.text)),
    ...(s.facts.map((f) => `${f.key} ${f.value}`)),
  ]
    .join(" ")
    .toLowerCase();

  // Wealth / partner path signals — recommendation only
  if (/\bwealth|partner|nri|high\s*value|business\s*loan|working\s*capital\b/.test(text)) {
    return {
      recommendationId: newId(),
      suggestion: "Consider assigning a Wealth Partner for guided origination",
      rationale: "Consultation signals suggest partner-assisted journey may help",
      proposalKind: "assign_wealth_partner",
      confidence: s.completion >= 60 ? "moderate" : "low",
      requiresHumanApproval: true,
    };
  }

  if (s.isCompletedLike && (s.hasProduct || s.objectives.length > 0)) {
    return {
      recommendationId: newId(),
      suggestion: "Partner assignment optional — RM can proceed with standard desk",
      rationale: "No strong partner-assist signal; keep as generic recommendation",
      proposalKind: "generic",
      confidence: "low",
      requiresHumanApproval: true,
    };
  }

  return undefined;
}
