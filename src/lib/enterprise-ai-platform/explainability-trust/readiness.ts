/**
 * Explainability & Trust readiness (CO-AI-110).
 */

import { EAI_EXPLAINABILITY_VERSION } from "@/constants/enterprise-ai-platform/explainability";
import { EAI_OUTSIDE_DOMAIN_REFUSAL } from "@/constants/enterprise-ai-platform/domain-governance";
import type { EaiExplainabilityReadinessResult } from "@/types/enterprise-ai-explainability";
import {
  ensureEaiBehaviourPackScaffolds,
  resetEaiBehaviourPackRegistry,
} from "../behaviour-packs";
import { resetEaiComposition } from "../composition";
import { runEaiConsultationIntelligence } from "../consultation-intelligence/orchestrator";
import { runEaiLeadIntelligence } from "../lead-intelligence/orchestrator";
import { runEaiExplainabilityTrust } from "./orchestrator";

export async function runEaiExplainabilityTrustReadiness(): Promise<EaiExplainabilityReadinessResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  resetEaiComposition();
  resetEaiBehaviourPackRegistry();
  ensureEaiBehaviourPackScaffolds();

  const outside = await runEaiExplainabilityTrust({
    sessionId: "sess_trust",
    conversationId: "conv_trust",
    personaPackId: "sarathi_customer",
    utterance: "Tell me a joke about politics",
  });
  if (!outside.blocked || outside.refusalText !== EAI_OUTSIDE_DOMAIN_REFUSAL) {
    errors.push("Outside domain must return fixed refusal");
  }
  if (!outside.recommendationExplanation.reasonCodes.some((r) => r.code === "RC_OUTSIDE_DOMAIN")) {
    errors.push("Outside explanation must include RC_OUTSIDE_DOMAIN");
  }

  const consultation = await runEaiConsultationIntelligence({
    sessionId: "sess_trust",
    conversationId: "conv_trust",
    personaPackId: "sarathi_customer",
    utterance:
      "I want a Balance Transfer of 25 lakh to reduce my EMI. I am salaried in Mumbai. Documents are ready.",
  });
  const leadIntelligence = await runEaiLeadIntelligence({
    sessionId: "sess_trust",
    conversationId: "conv_trust",
    personaPackId: "sarathi_customer",
    consultation,
    emitActionProposals: false,
  });

  const trust = await runEaiExplainabilityTrust({
    sessionId: "sess_trust",
    conversationId: "conv_trust",
    personaPackId: "sarathi_customer",
    consultation,
    leadIntelligence,
  });

  if (trust.blocked) errors.push("In-domain trust package must not be blocked");
  if (trust.recommendationExplanation.reasonCodes.length === 0) {
    errors.push("Must include reason codes");
  }
  if (trust.facts.some((f) => f.statementClass !== "fact")) {
    errors.push("Facts inventory mislabelled");
  }
  if (trust.assumptions.some((a) => a.statementClass !== "assumption")) {
    errors.push("Assumptions inventory mislabelled");
  }
  if (trust.recommendations.some((r) => r.statementClass !== "recommendation")) {
    errors.push("Recommendations inventory mislabelled");
  }
  if (trust.recommendationExplanation.confidenceExplanation.uncertaintyLines.length === 0) {
    errors.push("Must not hide uncertainty");
  }
  if (trust.decisionTrace.length < 2) {
    errors.push("Decision trace must include multiple observed stages");
  }
  if (!trust.decisionTrace.some((s) => s.stage === "lead_intelligence")) {
    errors.push("Decision trace must include lead_intelligence stage");
  }
  if (!trust.decisionTrace.some((s) => s.stage === "explainability_trust")) {
    errors.push("Decision trace must include explainability_trust stage");
  }

  // Never fabricate — unknown codes
  const catalogueOk = trust.recommendationExplanation.reasonCodes.every((r) =>
    r.code.startsWith("RC_"),
  );
  if (!catalogueOk) errors.push("Reason codes must be catalogue RC_* ids");

  if (trust.facts.length === 0 && consultation.keyFacts.length > 0) {
    errors.push("Supporting facts should mirror consultation key facts");
  }

  if (trust.recommendationExplanation.alternatives.length === 0) {
    warnings.push("No alternative recommendations explained");
  }

  // Fabrication guard on facing text
  const blob = trust.recommendationExplanation.facingLines.join(" ").toLowerCase();
  if (/guaranteed approval|definitely qualifies|we calculated foir/.test(blob)) {
    errors.push("Facing explanation must not fabricate approval/calculation claims");
  }

  if (!trust.validation.valid) {
    errors.push(
      `Validation failed: ${trust.validation.issues
        .filter((i) => i.severity === "error")
        .map((i) => i.message)
        .join("; ")}`,
    );
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    details: {
      explainabilityVersion: EAI_EXPLAINABILITY_VERSION,
      outsideBlocked: outside.blocked,
      reasonCodes: trust.recommendationExplanation.reasonCodes.map((r) => r.code),
      factCount: trust.facts.length,
      assumptionCount: trust.assumptions.length,
      recommendationCount: trust.recommendations.length,
      missingUnknown: trust.recommendationExplanation.missingInformation.length,
      confidenceBand: trust.recommendationExplanation.confidenceExplanation.band,
      uncertaintyLines: trust.recommendationExplanation.confidenceExplanation.uncertaintyLines,
      traceStages: trust.decisionTrace.map((s) => s.stage),
      primaryTitle: trust.recommendationExplanation.recommendationTitle,
      alternativeCount: trust.recommendationExplanation.alternatives.length,
    },
  };
}
