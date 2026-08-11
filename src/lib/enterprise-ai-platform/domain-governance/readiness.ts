/**
 * Domain Intelligence readiness (CO-AI-104 DIE + AI-4A regression).
 */

import {
  EAI_DOMAIN_GOVERNANCE_VERSION,
  EAI_KNOWLEDGE_TOPICS,
  EAI_OUTSIDE_DOMAIN_REFUSAL,
} from "@/constants/enterprise-ai-platform/domain-governance";
import type { EaiDomainGovernanceReadinessResult } from "@/types/enterprise-ai-domain-governance";
import {
  ensureEaiBehaviourPackScaffolds,
  resetEaiBehaviourPackRegistry,
} from "../behaviour-packs";
import { resetEaiComposition } from "../composition";
import { buildEaiContextPackage } from "../context-intelligence/package-builder";
import { evaluateEaiPolicy } from "../policy-gate";
import { composeEaiResponse } from "../response-composer";
import { evaluateEaiDomainBoundary } from "./domain-boundary";
import {
  ensureEaiKnowledgeSourcesSeeded,
  listEaiKnowledgeSources,
  registerEaiKnowledgeSource,
  resetEaiKnowledgeSources,
} from "./knowledge-governance";
import { applyEaiMicroCommunication } from "./micro-communication";
import { listEaiToneEntries, validateEaiToneLibraryIntegrity } from "./tone-library";

export async function runEaiDomainGovernanceReadiness(): Promise<EaiDomainGovernanceReadinessResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  resetEaiComposition();
  resetEaiBehaviourPackRegistry();
  ensureEaiBehaviourPackScaffolds();
  resetEaiKnowledgeSources();
  ensureEaiKnowledgeSourcesSeeded();

  if (EAI_KNOWLEDGE_TOPICS.length < 20) {
    errors.push("Expected comprehensive knowledge topic catalogue");
  }

  const bt = evaluateEaiDomainBoundary({
    utterance: "What is Balance Transfer?",
    personaPackId: "sarathi_customer",
  });
  if (bt.policyDeny || bt.zone !== "zone_1_core") {
    errors.push(`BT education should allow core domain: ${bt.outcome}`);
  }
  if (bt.intent !== "knowledge") {
    errors.push(`BT education intent should be knowledge, got ${bt.intent}`);
  }
  if (bt.toneCategoryId !== "balance_transfer") {
    warnings.push(`BT tone expected balance_transfer, got ${bt.toneCategoryId}`);
  }

  // Outside refuse — identical across packs
  for (const pack of ["sarathi_customer", "sarathi_wealth_partner", "platform_none", "chanakya_executive"] as const) {
    const cricket = evaluateEaiDomainBoundary({
      utterance: "Who won the IPL cricket final?",
      personaPackId: pack,
    });
    if (!cricket.policyDeny || cricket.outcome !== "refuse_outside") {
      errors.push(`Sports must be refused for pack ${pack}`);
    }
    if (cricket.safeRefusalText !== EAI_OUTSIDE_DOMAIN_REFUSAL) {
      errors.push(`Outside refusal must be exact fixed sentence for ${pack}`);
    }
    if (cricket.redirectHints.length > 0) {
      errors.push(`Outside refusal must not redirect for ${pack}`);
    }
  }

  const unknown = evaluateEaiDomainBoundary({
    utterance: "Write me a poem about clouds",
    personaPackId: "sarathi_customer",
  });
  if (!unknown.policyDeny || unknown.safeRefusalText !== EAI_OUTSIDE_DOMAIN_REFUSAL) {
    errors.push("Unknown domain must return fixed outside refusal");
  }

  const mixed = evaluateEaiDomainBoundary({
    utterance: "Explain home loan EMI and also who is the Prime Minister",
    personaPackId: "sarathi_customer",
  });
  if (!mixed.mixedDomain || mixed.outcome !== "allow_mixed_constrained") {
    errors.push("Mixed-domain must be constrained allow");
  }
  if (mixed.blocksLlm) {
    errors.push("Mixed-domain with core signal must not fully block LLM");
  }

  const stamp = evaluateEaiDomainBoundary({
    utterance: "What is stamp duty when buying a flat?",
    personaPackId: "sarathi_customer",
  });
  if (stamp.zone !== "zone_2_adjacent" || stamp.policyDeny) {
    errors.push("Stamp duty should be adjacent allow");
  }

  const policyBlocked = evaluateEaiPolicy({
    sessionId: "sess_die",
    conversationId: "conv_die",
    personaPackId: "sarathi_customer",
    requestedToolIds: [],
    requestedDataScopes: [],
    intentHint: "Tell me a joke about politics",
  });
  if (policyBlocked.allowed) {
    errors.push("Policy Gate must deny outside-domain requests");
  }
  if (policyBlocked.safeRefusalText !== EAI_OUTSIDE_DOMAIN_REFUSAL) {
    errors.push("Policy Gate must surface fixed outside refusal");
  }

  const policyOk = evaluateEaiPolicy({
    sessionId: "sess_die",
    conversationId: "conv_die",
    personaPackId: "sarathi_customer",
    requestedToolIds: [],
    requestedDataScopes: ["product.catalog_public"],
    intentHint: "Can I reduce my EMI?",
  });
  if (!policyOk.allowed) {
    errors.push(`In-domain EMI must be allowed: ${policyOk.blockedReasons.join("; ")}`);
  }

  // Context Builder must not retrieve knowledge for outside domain
  const blockedPkg = await buildEaiContextPackage({
    sessionId: "sess_die",
    conversationId: "conv_die",
    personaPackId: "sarathi_customer",
    requestHint: "Write a python script for me",
  });
  if (!blockedPkg.domainBoundaryBlocked || blockedPkg.sections.length > 0) {
    errors.push("Context Builder must skip knowledge for outside domain");
  }
  if (blockedPkg.domainRefusalText !== EAI_OUTSIDE_DOMAIN_REFUSAL) {
    errors.push("Blocked context package must carry fixed refusal");
  }

  const okPkg = await buildEaiContextPackage({
    sessionId: "sess_die",
    conversationId: "conv_die",
    personaPackId: "sarathi_customer",
    requestHint: "What is Balance Transfer?",
  });
  if (okPkg.domainBoundaryBlocked) {
    errors.push("In-domain BT must not block Context Builder");
  }

  // Tone Library integrity
  errors.push(...validateEaiToneLibraryIntegrity());
  if (listEaiToneEntries().length < 8) {
    errors.push("Tone Library incomplete");
  }

  // Micro communication
  const micro = applyEaiMicroCommunication(
    "Buying a home matters. Let's explore your options. This is an extra sentence that should be truncated for micro rules.",
  );
  if (micro.lineCount < 1) {
    errors.push("Micro communication produced empty text");
  }
  const outsideMicro = applyEaiMicroCommunication(EAI_OUTSIDE_DOMAIN_REFUSAL);
  if (outsideMicro.text !== EAI_OUTSIDE_DOMAIN_REFUSAL) {
    errors.push("Micro communication must preserve outside refusal verbatim");
  }

  // Composer outside path
  const composed = composeEaiResponse({
    sessionId: "sess_die",
    conversationId: "conv_die",
    personaPackId: "sarathi_customer",
    llmOutput: "This should never appear",
    enterpriseResults: [],
    policyDecision: policyBlocked,
    actionProposals: [],
    confidence: "low",
  });
  if (composed.text !== EAI_OUTSIDE_DOMAIN_REFUSAL) {
    errors.push("Composer must emit only the fixed outside refusal");
  }

  try {
    registerEaiKnowledgeSource({
      sourceId: "evil_outside",
      displayName: "Outside",
      zone: "zone_3_outside",
    });
    errors.push("Zone 3 knowledge source registration must throw");
  } catch {
    // expected
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    details: {
      domainGovernanceVersion: EAI_DOMAIN_GOVERNANCE_VERSION,
      topicCount: EAI_KNOWLEDGE_TOPICS.length,
      knowledgeSourceCount: listEaiKnowledgeSources().length,
      toneCount: listEaiToneEntries().length,
      btOutcome: bt.outcome,
      mixedOutcome: mixed.outcome,
      policyBlockedAllowed: policyBlocked.allowed,
      policyOkAllowed: policyOk.allowed,
      contextBlocked: blockedPkg.domainBoundaryBlocked === true,
      outsideRefusal: EAI_OUTSIDE_DOMAIN_REFUSAL,
    },
  };
}
