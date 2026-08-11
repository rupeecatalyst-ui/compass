/**
 * Lead Intelligence readiness (CO-AI-109).
 */

import { EAI_LEAD_INTELLIGENCE_VERSION } from "@/constants/enterprise-ai-platform/lead-intelligence";
import { EAI_OUTSIDE_DOMAIN_REFUSAL } from "@/constants/enterprise-ai-platform/domain-governance";
import type { EaiLeadIntelligenceReadinessResult } from "@/types/enterprise-ai-lead-intelligence";
import {
  ensureEaiBehaviourPackScaffolds,
  resetEaiBehaviourPackRegistry,
} from "../behaviour-packs";
import { resetEaiComposition } from "../composition";
import { getEaiActionProposal, updateEaiActionProposalStatus } from "../action-proposals";
import { runEaiConsultationIntelligence } from "../consultation-intelligence/orchestrator";
import { runEaiLeadIntelligence } from "./orchestrator";

export async function runEaiLeadIntelligenceReadiness(): Promise<EaiLeadIntelligenceReadinessResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  resetEaiComposition();
  resetEaiBehaviourPackRegistry();
  ensureEaiBehaviourPackScaffolds();

  const outside = await runEaiLeadIntelligence({
    sessionId: "sess_li",
    conversationId: "conv_li",
    personaPackId: "sarathi_customer",
    utterance: "Tell me a joke about politics",
    emitActionProposals: true,
  });
  if (!outside.blocked || outside.refusalText !== EAI_OUTSIDE_DOMAIN_REFUSAL) {
    errors.push("Outside domain must return fixed refusal");
  }
  if (outside.actionProposalIds.length > 0) {
    errors.push("Outside domain must not emit proposals");
  }
  if (outside.leadsCreated !== false || outside.workflowsTriggered !== false) {
    errors.push("Must never create leads or trigger workflows");
  }

  const consultation = await runEaiConsultationIntelligence({
    sessionId: "sess_li",
    conversationId: "conv_li",
    personaPackId: "sarathi_customer",
    utterance:
      "I want a Balance Transfer of 25 lakh to reduce my EMI. I am salaried in Mumbai. Documents are ready.",
  });

  const rich = await runEaiLeadIntelligence({
    sessionId: "sess_li",
    conversationId: "conv_li",
    personaPackId: "sarathi_customer",
    consultation,
    emitActionProposals: true,
  });

  if (rich.blocked) errors.push("Rich consultation must not be blocked");
  if (rich.leadReadiness.score <= 0) errors.push("Lead readiness should score above zero");
  if (rich.opportunityReadiness.score <= 0) errors.push("Opportunity readiness should score above zero");
  if (rich.documentReadiness.score <= 0) errors.push("Document readiness should score above zero");
  if (rich.customerReadiness.score <= 0) errors.push("Customer readiness should score above zero");
  if (rich.priorityScore <= 0) errors.push("Priority score should be positive");
  if (rich.nextBestActions.length === 0) errors.push("Must produce next best actions");
  if (rich.rankedProposals.length === 0) {
    errors.push("Ready consultation should produce ranked proposals");
  }
  if (rich.actionProposalIds.length === 0) {
    errors.push("emitActionProposals should mint draft proposals");
  } else {
    const prop = getEaiActionProposal(rich.actionProposalIds[0]!);
    if (!prop || prop.status !== "draft") {
      errors.push("Proposals must start as draft");
    }
    if (prop && !prop.requiresHumanApproval) {
      errors.push("Proposals must require human approval");
    }
    const blocked = updateEaiActionProposalStatus(prop!.proposalId, "executed_reserved");
    if (blocked?.status === "executed_reserved") {
      errors.push("Execution must remain blocked");
    }
  }

  // Ensure we can propose create_lead / create_opportunity as recommendations
  const kinds = rich.rankedProposals.map((p) => p.kind);
  if (!kinds.includes("create_lead") && rich.leadReadiness.band !== "not_ready") {
    warnings.push("Expected create_lead proposal when lead readiness is not not_ready");
  }
  if (
    !kinds.includes("create_opportunity") &&
    (rich.opportunityReadiness.band === "ready" || rich.opportunityReadiness.band === "strong")
  ) {
    errors.push("Ready opportunity should rank create_opportunity proposal");
  }

  for (const p of rich.rankedProposals) {
    if (!p.executionForbidden || !p.requiresHumanApproval) {
      errors.push("Ranked proposals must forbid execution and require approval");
    }
  }

  if (rich.leadsCreated !== false || rich.opportunitiesCreated !== false) {
    errors.push("Must never set leads/opportunities created true");
  }
  if (rich.crmModified !== false || rich.workflowsTriggered !== false) {
    errors.push("Must never modify CRM or trigger workflows");
  }
  if (!rich.validation.valid) {
    errors.push(
      `Validation failed: ${rich.validation.issues
        .filter((i) => i.severity === "error")
        .map((i) => i.message)
        .join("; ")}`,
    );
  }

  // Thin consultation — more continue / fewer CRM proposals
  const thin = await runEaiLeadIntelligence({
    sessionId: "sess_li",
    conversationId: "conv_li",
    personaPackId: "sarathi_customer",
    utterance: "I might need a loan someday",
    emitActionProposals: false,
  });
  if (thin.leadsCreated !== false) errors.push("Thin path must not create leads");
  if (thin.actionProposalIds.length > 0) {
    errors.push("emitActionProposals=false must not mint proposals");
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    details: {
      leadIntelligenceVersion: EAI_LEAD_INTELLIGENCE_VERSION,
      outsideBlocked: outside.blocked,
      leadBand: rich.leadReadiness.band,
      opportunityBand: rich.opportunityReadiness.band,
      documentBand: rich.documentReadiness.band,
      customerBand: rich.customerReadiness.band,
      priorityScore: rich.priorityScore,
      confidence: rich.confidence.band,
      rankedKinds: kinds,
      proposalCount: rich.actionProposalIds.length,
      thinNba: thin.nextBestActions.map((a) => a.kind),
    },
  };
}
