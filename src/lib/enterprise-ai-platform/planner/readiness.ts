/**
 * Planner readiness (CO-AI-107).
 */

import { EAI_PLANNER_VERSION } from "@/constants/enterprise-ai-platform/planner";
import { EAI_OUTSIDE_DOMAIN_REFUSAL } from "@/constants/enterprise-ai-platform/domain-governance";
import type { EaiPlannerReadinessResult } from "@/types/enterprise-ai-planner";
import {
  ensureEaiBehaviourPackScaffolds,
  resetEaiBehaviourPackRegistry,
} from "../behaviour-packs";
import { resetEaiComposition } from "../composition";
import { getEaiActionProposal, updateEaiActionProposalStatus } from "../action-proposals";
import { runEaiPlanner } from "./orchestrator";

export async function runEaiPlannerReadiness(): Promise<EaiPlannerReadinessResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  resetEaiComposition();
  resetEaiBehaviourPackRegistry();
  ensureEaiBehaviourPackScaffolds();

  const outside = await runEaiPlanner({
    sessionId: "sess_plan",
    conversationId: "conv_plan",
    personaPackId: "sarathi_customer",
    utterance: "Tell me a joke about politics",
  });
  if (!outside.blocked || outside.refusalText !== EAI_OUTSIDE_DOMAIN_REFUSAL) {
    errors.push("Outside domain must return fixed refusal");
  }
  if (outside.selectedQuestions.length > 0 || outside.actionProposalIds.length > 0) {
    errors.push("Outside domain must not ask questions or create proposals");
  }
  if (!outside.validation.valid) {
    errors.push(`Outside validation failed: ${outside.validation.issues.map((i) => i.message).join("; ")}`);
  }

  const bt = await runEaiPlanner({
    sessionId: "sess_plan",
    conversationId: "conv_plan",
    personaPackId: "sarathi_customer",
    utterance: "I want a Balance Transfer to reduce my EMI",
    conversationMemory: {
      knownFacts: [],
      openQuestions: [],
      previousRecommendations: [],
      outstandingActions: [],
    },
  });
  if (bt.blocked) errors.push("BT plan must not be blocked");
  if (!bt.missingInformation.some((m) => m.slotId === "existing_emi" || m.slotId === "outstanding_loan")) {
    errors.push("BT should detect EMI/outstanding gaps");
  }
  if (bt.selectedQuestions.length === 0) {
    errors.push("BT with unknown facts should select clarifying questions");
  }
  if (bt.selectedQuestions.length > 2) {
    errors.push("Must not exceed minimum question budget");
  }
  if (!bt.nextBestActions.some((a) => a.kind === "ask_question" || a.kind === "defer_to_engine")) {
    errors.push("BT NBA should ask or defer to engines");
  }
  if (!bt.validation.valid) {
    errors.push(
      `BT validation failed: ${bt.validation.issues
        .filter((i) => i.severity === "error")
        .map((i) => i.message)
        .join("; ")}`,
    );
  }

  // Skip known information
  const known = await runEaiPlanner({
    sessionId: "sess_plan",
    conversationId: "conv_plan",
    personaPackId: "sarathi_customer",
    utterance: "Can I get a home loan eligibility check?",
    conversationMemory: {
      knownFacts: [
        { key: "product_interest", value: "home loan", provenance: "user_stated" },
        { key: "required_amount", value: "50 lakh", provenance: "user_stated" },
        { key: "employment", value: "salaried", provenance: "user_stated" },
      ],
      openQuestions: [],
      previousRecommendations: [],
      outstandingActions: [],
      summary: "Customer wants home loan 50 lakh salaried",
    },
  });
  if (known.selectedQuestions.some((q) => q.slotId === "product_interest")) {
    errors.push("Must skip already known product_interest");
  }
  if (known.selectedQuestions.some((q) => q.slotId === "required_amount")) {
    errors.push("Must skip already known required_amount");
  }
  if (known.skippedQuestions.filter((q) => q.skipReason?.includes("Already known")).length === 0) {
    warnings.push("Expected skipped-known questions when memory is populated");
  }

  // Action proposals only — no execution
  const docs = await runEaiPlanner({
    sessionId: "sess_plan",
    conversationId: "conv_plan",
    personaPackId: "sarathi_customer",
    utterance: "Which KYC documents do I need? Please request them.",
    emitActionProposals: true,
  });
  if (docs.blocked) errors.push("KYC document planning must remain in domain");
  if (!docs.nextBestActions.some((a) => a.kind === "propose_document_request")) {
    errors.push("Document utterance should propose document request");
  }
  if (docs.actionProposalIds.length === 0) {
    errors.push("emitActionProposals should create draft proposals");
  } else {
    const propId = docs.actionProposalIds[0]!;
    const before = getEaiActionProposal(propId);
    if (!before || before.status !== "draft") {
      errors.push("Planner proposals must start as draft");
    }
    const blockedExec = updateEaiActionProposalStatus(propId, "executed_reserved");
    if (blockedExec?.status === "executed_reserved") {
      errors.push("Execution must remain blocked — proposal only");
    }
    if (before?.kind === "create_lead" || before?.kind === "create_opportunity") {
      errors.push("Planner must not auto-emit lead/opportunity proposals in this path");
    }
  }

  // Duplicate open question suppression
  const dup = await runEaiPlanner({
    sessionId: "sess_plan",
    conversationId: "conv_plan",
    personaPackId: "sarathi_customer",
    utterance: "I need a loan to reduce my EMI",
    conversationMemory: {
      knownFacts: [],
      openQuestions: ["What is your current EMI?"],
      previousRecommendations: [],
      outstandingActions: [],
    },
  });
  if (dup.selectedQuestions.some((q) => /current emi/i.test(q.text))) {
    errors.push("Must not duplicate open question already in memory");
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    details: {
      plannerVersion: EAI_PLANNER_VERSION,
      outsideBlocked: outside.blocked,
      btQuestionCount: bt.selectedQuestions.length,
      btMissingSlots: bt.missingInformation.map((m) => m.slotId),
      knownSkipped: known.skippedQuestions.length,
      docsProposalCount: docs.actionProposalIds.length,
      docsModes: docs.nextBestActions.map((a) => a.kind),
      followUpCount: bt.followUps.length,
      sequenced: bt.sequencedRecommendations.slice(0, 2),
    },
  };
}
