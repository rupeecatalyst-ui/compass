/**
 * Priority Scoring (CO-AI-109).
 * Overall recommendation priority — not credit approval.
 */

import type { EaiReadinessAssessment } from "@/types/enterprise-ai-lead-intelligence";

export function scoreEaiLeadIntelligencePriority(input: {
  lead: EaiReadinessAssessment;
  opportunity: EaiReadinessAssessment;
  document: EaiReadinessAssessment;
  customer: EaiReadinessAssessment;
}): number {
  const weighted =
    input.lead.score * 0.3 +
    input.opportunity.score * 0.3 +
    input.customer.score * 0.25 +
    input.document.score * 0.15;
  return Math.round(Math.max(0, Math.min(100, weighted)));
}
