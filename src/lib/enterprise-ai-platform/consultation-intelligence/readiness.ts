/**
 * Consultation Intelligence readiness (CO-AI-108).
 */

import { EAI_CONSULTATION_VERSION } from "@/constants/enterprise-ai-platform/consultation-intelligence";
import { EAI_OUTSIDE_DOMAIN_REFUSAL } from "@/constants/enterprise-ai-platform/domain-governance";
import type { EaiConsultationReadinessResult } from "@/types/enterprise-ai-consultation";
import {
  ensureEaiBehaviourPackScaffolds,
  resetEaiBehaviourPackRegistry,
} from "../behaviour-packs";
import { resetEaiComposition } from "../composition";
import { runEaiConsultationIntelligence } from "./orchestrator";

export async function runEaiConsultationIntelligenceReadiness(): Promise<EaiConsultationReadinessResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  resetEaiComposition();
  resetEaiBehaviourPackRegistry();
  ensureEaiBehaviourPackScaffolds();

  const outside = await runEaiConsultationIntelligence({
    sessionId: "sess_consult",
    conversationId: "conv_consult",
    personaPackId: "sarathi_customer",
    utterance: "Tell me a joke about politics",
  });
  if (!outside.blocked || outside.refusalText !== EAI_OUTSIDE_DOMAIN_REFUSAL) {
    errors.push("Outside domain must return fixed refusal");
  }
  if (outside.lifecycleState !== "outside_refused") {
    errors.push("Outside consultation must be outside_refused");
  }
  if (outside.crmRecordsCreated !== false || outside.workflowsExecuted !== false) {
    errors.push("Must never create CRM or execute workflows");
  }
  if (!outside.validation.valid) {
    errors.push(`Outside validation failed: ${outside.validation.issues.map((i) => i.message).join("; ")}`);
  }

  const bt = await runEaiConsultationIntelligence({
    sessionId: "sess_consult",
    conversationId: "conv_consult",
    personaPackId: "sarathi_customer",
    utterance: "I want a Balance Transfer of 25 lakh to reduce my EMI. I am salaried.",
  });
  if (bt.blocked) errors.push("BT consultation must not be blocked");
  if (bt.customerObjectives.length === 0) errors.push("BT should capture customer objectives");
  if (bt.keyFacts.length < 2) errors.push("BT should extract multiple key facts");
  if (!bt.financialConcerns.some((c) => c.category === "affordability") && !/emi/i.test(bt.summary.facingText)) {
    warnings.push("BT affordability concern optional if summary covers EMI");
  }
  if (bt.missingInformation.length === 0) {
    warnings.push("Expected some missing-information assessment for BT");
  }
  if (!bt.summary.facingText.trim()) errors.push("BT must produce consultation summary");
  if (bt.completionScore.score <= 0) errors.push("Completion score must be positive in-domain");
  if (bt.confidence.band === "unspecified" && bt.keyFacts.length >= 2) {
    warnings.push("Confidence unexpectedly unspecified with facts present");
  }
  if (bt.transitions.length === 0) errors.push("Lifecycle must record transitions");
  if (bt.lifecycleState === "initiated") errors.push("Lifecycle must advance beyond initiated");
  if (bt.crmRecordsCreated !== false) errors.push("crmRecordsCreated must be false");
  if (bt.workflowsExecuted !== false) errors.push("workflowsExecuted must be false");
  if (!bt.validation.valid) {
    errors.push(
      `BT validation failed: ${bt.validation.issues
        .filter((i) => i.severity === "error")
        .map((i) => i.message)
        .join("; ")}`,
    );
  }

  const known = await runEaiConsultationIntelligence({
    sessionId: "sess_consult",
    conversationId: "conv_consult",
    personaPackId: "sarathi_customer",
    utterance: "Need home loan eligibility in Pune",
    priorState: "gathering",
    conversationMemory: {
      knownFacts: [
        { key: "product_interest", value: "home loan", provenance: "user_stated" },
        { key: "required_amount", value: "50 lakh", provenance: "user_stated" },
        { key: "employment_type", value: "salaried", provenance: "user_stated" },
      ],
      openQuestions: [],
      previousRecommendations: [],
      outstandingActions: [],
      intent: "Home loan eligibility",
    },
  });
  if (known.keyFacts.length < 3) errors.push("Memory facts should appear in key facts");
  if (known.customerObjectives.length === 0) errors.push("Should capture eligibility objective");

  // Continuity: summarizing → completed path
  const rich = await runEaiConsultationIntelligence({
    sessionId: "sess_consult",
    conversationId: "conv_consult",
    personaPackId: "sarathi_customer",
    priorState: "summarizing",
    utterance:
      "Home loan 40 lakh salaried in Mumbai. Current EMI is 25000. Outstanding 18 lakh. Documents ready.",
  });
  if (rich.completionScore.score < 45) {
    errors.push("Rich consultation should score at least moderate completion");
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    details: {
      consultationVersion: EAI_CONSULTATION_VERSION,
      outsideBlocked: outside.blocked,
      btState: bt.lifecycleState,
      btFactCount: bt.keyFacts.length,
      btObjectives: bt.customerObjectives.map((o) => o.text),
      btCompletion: bt.completionScore.score,
      btConfidence: bt.confidence.band,
      btSummaryPreview: bt.summary.facingText.slice(0, 120),
      knownFactCount: known.keyFacts.length,
      richState: rich.lifecycleState,
      richCompletion: rich.completionScore.score,
    },
  };
}
