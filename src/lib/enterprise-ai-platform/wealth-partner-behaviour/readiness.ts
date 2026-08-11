/**
 * Wealth Partner Behaviour Pack readiness (CO-AI-112).
 */

import {
  EAI_WEALTH_PARTNER_BEHAVIOUR_VERSION,
  EAI_WEALTH_PARTNER_CAPABILITY_THEMES,
  EAI_WEALTH_PARTNER_PACK_ID,
  EAI_WEALTH_PARTNER_SUGGESTED_QUESTIONS,
} from "@/constants/enterprise-ai-platform/wealth-partner-behaviour";
import { EAI_OUTSIDE_DOMAIN_REFUSAL } from "@/constants/enterprise-ai-platform/domain-governance";
import { EAI_TONE_LIBRARY } from "@/constants/enterprise-ai-platform/tone-library";
import type { EaiWealthPartnerBehaviourReadinessResult } from "@/types/enterprise-ai-wealth-partner-behaviour";
import {
  ensureEaiBehaviourPackScaffolds,
  loadEaiBehaviourPack,
  resetEaiBehaviourPackRegistry,
} from "../behaviour-packs";
import { resetEaiComposition } from "../composition";
import { runEaiSarathiConversationTurn } from "../conversation-experience/turn-orchestrator";
import {
  resolveEaiToneAudience,
  resolveEaiToneMessage,
  validateEaiToneLibraryIntegrity,
} from "../domain-governance/tone-library";
import { evaluateEaiCapabilityPermission } from "../permission-matrix";
import { updateEaiActionProposalStatus } from "../action-proposals";
import { activateEaiWealthPartnerBehaviourPack } from "./activate";

export async function runEaiWealthPartnerBehaviourReadiness(): Promise<EaiWealthPartnerBehaviourReadinessResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  resetEaiComposition();
  resetEaiBehaviourPackRegistry();
  ensureEaiBehaviourPackScaffolds();
  const activation = activateEaiWealthPartnerBehaviourPack();

  const pack = loadEaiBehaviourPack(EAI_WEALTH_PARTNER_PACK_ID);
  if (!pack) {
    errors.push("Wealth Partner Behaviour Pack must load");
  } else {
    if (pack.lifecycle !== "active") {
      errors.push(`Wealth Partner pack lifecycle must be active, found ${pack.lifecycle}`);
    }
    if (pack.configuration.tone !== "formal") {
      errors.push("Wealth Partner tone profile must be formal");
    }
    if (pack.configuration.communicationStyle !== "advisory_reserved") {
      errors.push("Wealth Partner communication must be advisory_reserved");
    }
    for (const theme of EAI_WEALTH_PARTNER_CAPABILITY_THEMES) {
      for (const capabilityId of theme.capabilityIds) {
        if (!pack.manifest.capabilities.includes(capabilityId)) {
          errors.push(
            `Theme ${theme.themeId} requires capability ${capabilityId} on Wealth Partner pack`,
          );
        }
      }
    }
  }

  const crm = evaluateEaiCapabilityPermission("crm_mutation", pack);
  const workflow = evaluateEaiCapabilityPermission("workflow_execution", pack);
  const voice = evaluateEaiCapabilityPermission("voice", pack);
  if (crm.allowed) errors.push("Wealth Partner must deny crm_mutation");
  if (workflow.allowed) errors.push("Wealth Partner must deny workflow_execution");
  if (!voice.allowed) {
    warnings.push(
      "Voice capability not allowed on Wealth Partner — AI-13 enables voice as interface",
    );
  }

  errors.push(...validateEaiToneLibraryIntegrity());

  if (resolveEaiToneAudience(EAI_WEALTH_PARTNER_PACK_ID) !== "partner") {
    errors.push("Wealth Partner persona must resolve to partner tone audience");
  }
  if (resolveEaiToneAudience("sarathi_customer") !== "customer") {
    errors.push("Customer persona must resolve to customer tone audience");
  }

  // Partner tone must differ from customer warm BT opener
  const partnerBt = resolveEaiToneMessage("balance_transfer", "partner");
  const customerBt = resolveEaiToneMessage("balance_transfer", "customer");
  if (!partnerBt.trim()) errors.push("Partner BT tone line required");
  if (partnerBt === customerBt) {
    errors.push("Partner BT tone must not equal customer BT tone");
  }
  if (/let's reduce your borrowing cost/i.test(partnerBt)) {
    errors.push("Partner tone must never use customer-facing BT copy");
  }

  // Spot-check: no partner line equals any customer library line
  for (const customerEntry of EAI_TONE_LIBRARY) {
    const partnerLine = resolveEaiToneMessage(customerEntry.categoryId, "partner");
    for (const customerLine of customerEntry.lines) {
      if (partnerLine && partnerLine.split("\n").includes(customerLine)) {
        errors.push(
          `Partner tone reuses customer line for ${customerEntry.categoryId}: "${customerLine}"`,
        );
      }
    }
  }

  if (EAI_WEALTH_PARTNER_SUGGESTED_QUESTIONS.length < 3) {
    errors.push("Partner suggested questions required");
  }

  const outside = await runEaiSarathiConversationTurn({
    utterance: "Tell me a joke about politics",
    personaPackId: EAI_WEALTH_PARTNER_PACK_ID,
    emitActionProposals: true,
  });
  if (!outside.blocked || outside.facingText !== EAI_OUTSIDE_DOMAIN_REFUSAL) {
    errors.push("Wealth Partner outside domain must use fixed refusal");
  }

  const turn = await runEaiSarathiConversationTurn({
    utterance: "I need partner guidance on a Balance Transfer case for my customer",
    personaPackId: EAI_WEALTH_PARTNER_PACK_ID,
    emitActionProposals: true,
  });
  if (turn.blocked) errors.push("In-domain Wealth Partner turn must not block");
  if (turn.continuity.personaPackId !== EAI_WEALTH_PARTNER_PACK_ID) {
    errors.push("Continuity must retain Wealth Partner persona");
  }
  if (!turn.assistantMessage.text.trim()) {
    errors.push("Wealth Partner must produce facing text");
  }
  if (/buying a home matters|let's explore your options|let's reduce your borrowing cost/i.test(
    turn.facingText,
  )) {
    errors.push("Wealth Partner facing text must not use customer-facing tone lines");
  }

  // Conversation history across turns
  const followUp = await runEaiSarathiConversationTurn({
    utterance: "Customer is salaried; outstanding is 25 lakh",
    continuity: turn.continuity,
    personaPackId: EAI_WEALTH_PARTNER_PACK_ID,
    emitActionProposals: true,
  });
  if (followUp.continuity.messages.length < 4) {
    errors.push("Conversation history must accumulate for Wealth Partner");
  }
  if (followUp.continuity.conversationId !== turn.continuity.conversationId) {
    errors.push("Wealth Partner conversation id must continue");
  }

  if (followUp.actionProposals.length > 0) {
    const p = followUp.actionProposals[0]!;
    if (p.status !== "draft" && p.status !== "pending_review") {
      errors.push("Wealth Partner proposals must remain draft/pending_review");
    }
    const blocked = updateEaiActionProposalStatus(p.proposalId, "executed_reserved");
    if (blocked?.status === "executed_reserved") {
      errors.push("Wealth Partner must never execute proposals");
    }
  } else {
    warnings.push("No draft proposals on partner BT path");
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    details: {
      wealthPartnerBehaviourVersion: EAI_WEALTH_PARTNER_BEHAVIOUR_VERSION,
      activation,
      themeCount: EAI_WEALTH_PARTNER_CAPABILITY_THEMES.length,
      partnerBtTone: partnerBt,
      historyLength: followUp.continuity.messages.length,
      facingPreview: turn.facingText.slice(0, 140),
      proposalCount: followUp.actionProposals.length,
    },
  };
}
