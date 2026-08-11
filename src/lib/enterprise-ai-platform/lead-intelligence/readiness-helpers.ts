/**
 * Shared readiness scoring helpers (CO-AI-109).
 */

import type { EaiReadinessBand } from "@/types/enterprise-ai-lead-intelligence";
import type { EaiConsultationObject } from "@/types/enterprise-ai-consultation";

export function bandFromScore(score: number): EaiReadinessBand {
  if (score >= 85) return "strong";
  if (score >= 65) return "ready";
  if (score >= 35) return "partial";
  return "not_ready";
}

export function consultationSignals(consultation?: EaiConsultationObject) {
  const facts = consultation?.keyFacts ?? [];
  const objectives = consultation?.customerObjectives ?? [];
  const missingUnknown = (consultation?.missingInformation ?? []).filter((m) => !m.alreadyKnown);
  const concerns = consultation?.financialConcerns ?? [];
  const completion = consultation?.completionScore.score ?? 0;
  const lifecycle = consultation?.lifecycleState;
  const hasProduct = facts.some((f) => /product|home loan|bt|balance|lap|business|personal/i.test(`${f.key} ${f.value}`));
  const hasAmount = facts.some((f) => /amount|lakh|crore|₹|rs/i.test(`${f.key} ${f.value}`));
  const hasEmployment = facts.some((f) => /employ|salaried|self/i.test(`${f.key} ${f.value}`));
  const hasDocsReady = facts.some((f) => /document|kyc/i.test(`${f.key} ${f.value}`) && /ready|complete|uploaded/i.test(f.value));
  const docsGap = missingUnknown.some((m) => m.slotId === "document_readiness");

  return {
    facts,
    objectives,
    missingUnknown,
    concerns,
    completion,
    lifecycle,
    hasProduct,
    hasAmount,
    hasEmployment,
    hasDocsReady,
    docsGap,
    isCompletedLike: lifecycle === "completed" || lifecycle === "summarizing" || completion >= 70,
  };
}
