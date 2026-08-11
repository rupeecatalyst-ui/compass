/**
 * Advisory Reasoning readiness (CO-AI-106).
 */

import { EAI_ADVISORY_REASONING_VERSION } from "@/constants/enterprise-ai-platform/advisory-reasoning";
import { EAI_OUTSIDE_DOMAIN_REFUSAL } from "@/constants/enterprise-ai-platform/domain-governance";
import type { EaiAdvisoryReadinessResult } from "@/types/enterprise-ai-advisory-reasoning";
import {
  ensureEaiBehaviourPackScaffolds,
  resetEaiBehaviourPackRegistry,
} from "../behaviour-packs";
import { resetEaiComposition } from "../composition";
import { runEaiAdvisoryReasoning } from "./orchestrator";

export async function runEaiAdvisoryReasoningReadiness(): Promise<EaiAdvisoryReadinessResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  resetEaiComposition();
  resetEaiBehaviourPackRegistry();
  ensureEaiBehaviourPackScaffolds();

  const outside = await runEaiAdvisoryReasoning({
    sessionId: "sess_adv",
    conversationId: "conv_adv",
    personaPackId: "sarathi_customer",
    question: "Tell me a joke about politics",
  });
  if (!outside.blocked || outside.facingText !== EAI_OUTSIDE_DOMAIN_REFUSAL) {
    errors.push("Outside domain must return fixed refusal only");
  }
  if (!outside.validation.valid) {
    errors.push(`Outside validation failed: ${outside.validation.issues.map((i) => i.message).join("; ")}`);
  }

  const bt = await runEaiAdvisoryReasoning({
    sessionId: "sess_adv",
    conversationId: "conv_adv",
    personaPackId: "sarathi_customer",
    question: "What is Balance Transfer?",
  });
  if (bt.blocked) errors.push("BT education must not be blocked");
  if (!bt.modesUsed.includes("knowledge") && !bt.modesUsed.includes("loan_advisory")) {
    errors.push("BT should use knowledge or loan advisory mode");
  }
  if (bt.facingText.split(/\n\s*\n/).filter(Boolean).length > 1) {
    errors.push("BT advice must not be long paragraphs");
  }
  if (/you qualify|approved for/i.test(bt.facingText)) {
    errors.push("Advisory must not claim approval");
  }
  if (!bt.validation.valid) {
    errors.push(
      `BT validation failed: ${bt.validation.issues
        .filter((i) => i.severity === "error")
        .map((i) => i.message)
        .join("; ")}`,
    );
  }

  const emi = await runEaiAdvisoryReasoning({
    sessionId: "sess_adv",
    conversationId: "conv_adv",
    personaPackId: "sarathi_customer",
    question: "Can I reduce my EMI?",
  });
  if (emi.blocked) errors.push("EMI advisory must not be blocked");
  if (!emi.fragments.some((f) => f.defersToEnterpriseEngine)) {
    errors.push("EMI advisory must defer calculations to engines");
  }
  if (!emi.fdiPackageId) {
    warnings.push("EMI advisory did not link FDI package");
  }

  const compare = await runEaiAdvisoryReasoning({
    sessionId: "sess_adv",
    conversationId: "conv_adv",
    personaPackId: "sarathi_customer",
    question: "Compare LAP vs home loan",
  });
  if (!compare.modesUsed.includes("comparison") && !compare.modesUsed.includes("product_explanation")) {
    errors.push("Comparison question should use comparison or product explanation");
  }

  const docs = await runEaiAdvisoryReasoning({
    sessionId: "sess_adv",
    conversationId: "conv_adv",
    personaPackId: "sarathi_customer",
    question: "Which KYC documents do I need?",
  });
  if (docs.blocked) {
    errors.push("KYC document guidance must remain in approved financial domain");
  }
  if (!docs.modesUsed.includes("customer_guidance")) {
    errors.push("Document question should use customer guidance");
  }

  const journey = await runEaiAdvisoryReasoning({
    sessionId: "sess_adv",
    conversationId: "conv_adv",
    personaPackId: "sarathi_customer",
    question: "Where am I in the loan journey?",
  });
  if (!journey.modesUsed.includes("journey_guidance")) {
    errors.push("Journey question should use journey guidance");
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    details: {
      advisoryVersion: EAI_ADVISORY_REASONING_VERSION,
      outsideBlocked: outside.blocked,
      btModes: bt.modesUsed,
      emiDefers: emi.fragments.some((f) => f.defersToEnterpriseEngine),
      compareModes: compare.modesUsed,
      docsModes: docs.modesUsed,
      journeyModes: journey.modesUsed,
      btFacingPreview: bt.facingText.slice(0, 120),
    },
  };
}
