/**
 * Supporting facts + assumptions (CO-AI-110).
 * Facts only from observed sources. Assumptions explicitly labelled.
 */

import type { EaiConsultationObject } from "@/types/enterprise-ai-consultation";
import type { EaiLeadIntelligenceResult } from "@/types/enterprise-ai-lead-intelligence";
import type {
  EaiTrustAssumption,
  EaiTrustMissingInfo,
  EaiTrustReasonCode,
  EaiTrustSupportingFact,
} from "@/types/enterprise-ai-explainability";

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

export function collectEaiTrustSupportingFacts(
  consultation?: EaiConsultationObject,
): EaiTrustSupportingFact[] {
  return (consultation?.keyFacts ?? []).slice(0, 20).map((f) => ({
    factId: newId("eai_tf"),
    key: f.key,
    value: f.value,
    provenance: f.provenance,
    statementClass: "fact" as const,
  }));
}

export function collectEaiTrustMissingInformation(
  consultation?: EaiConsultationObject,
): EaiTrustMissingInfo[] {
  return (consultation?.missingInformation ?? []).map((m) => ({
    slotId: m.slotId,
    label: m.label,
    reason: m.reason,
    alreadyKnown: m.alreadyKnown,
  }));
}

/**
 * Assumptions are only emitted when a matching reason code exists.
 * Never promote assumptions to facts.
 */
export function deriveEaiTrustAssumptions(
  reasonCodes: EaiTrustReasonCode[],
  leadIntelligence?: EaiLeadIntelligenceResult,
): EaiTrustAssumption[] {
  const assumptions: EaiTrustAssumption[] = [];

  if (reasonCodes.some((r) => r.code === "RC_PARTNER_SIGNAL")) {
    assumptions.push({
      assumptionId: newId("eai_ta"),
      text: "Partner-assisted journey may help — not confirmed by CRM assignment",
      statementClass: "assumption",
      relatedReasonCodes: ["RC_PARTNER_SIGNAL"],
    });
  }

  if (reasonCodes.some((r) => r.code === "RC_ENGINE_DECISION_REQUIRED")) {
    assumptions.push({
      assumptionId: newId("eai_ta"),
      text: "Enterprise engines will decide eligibility and pricing when invoked",
      statementClass: "assumption",
      relatedReasonCodes: ["RC_ENGINE_DECISION_REQUIRED"],
    });
  }

  if (
    leadIntelligence &&
    (leadIntelligence.leadReadiness.band === "ready" ||
      leadIntelligence.leadReadiness.band === "strong") &&
    reasonCodes.some((r) => r.code === "RC_LEAD_READY")
  ) {
    assumptions.push({
      assumptionId: newId("eai_ta"),
      text: "Lead proposal readiness assumes consultation facts remain accurate",
      statementClass: "assumption",
      relatedReasonCodes: ["RC_LEAD_READY"],
    });
  }

  return assumptions;
}
