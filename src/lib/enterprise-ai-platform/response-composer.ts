/**
 * Response Composer — sole module allowed to generate audience-facing text.
 * CO-AI-101 + CO-AI-104 DIE + CO-AI-112 (audience-aware Tone Library) + CO-AI-114.
 */

import { EAI_COMPOSER_VERSION } from "@/constants/enterprise-ai-platform";
import { EAI_OUTSIDE_DOMAIN_REFUSAL } from "@/constants/enterprise-ai-platform/domain-governance";
import { applyEaiMicroCommunication } from "./domain-governance/micro-communication";
import {
  resolveEaiToneAudience,
  resolveEaiToneMessage,
} from "./domain-governance/tone-library";
import {
  getEaiOutsideDomainRefusalLocalised,
  localiseEaiResponseFacingText,
} from "./multilingual/localisation";
import type {
  EaiComposedResponse,
  EaiComposeInput,
  EaiRegistryRef,
} from "@/types/enterprise-ai-platform";

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function sanitizeFacingText(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 8000);
}

/**
 * Compose the final response. Does not call enterprise engines or LLM providers.
 * Callers must supply already-gated results.
 * Wealth Partner persona never receives customer-facing Tone Library lines.
 * AI-14: compose English first (behaviour SSOT), then localise facing text.
 */
export function composeEaiResponse(input: EaiComposeInput): EaiComposedResponse {
  const language = input.language ?? "en";
  const audience = resolveEaiToneAudience(input.personaPackId);

  if (input.policyDecision.domainBoundary?.blocksLlm) {
    // Facing may be localised; English canonical SSOT is EAI_OUTSIDE_DOMAIN_REFUSAL.
    const refusalFacing =
      language === "en"
        ? input.policyDecision.safeRefusalText ?? EAI_OUTSIDE_DOMAIN_REFUSAL
        : getEaiOutsideDomainRefusalLocalised(language);
    return {
      responseId: newId("eai_resp"),
      sessionId: input.sessionId,
      conversationId: input.conversationId,
      text: refusalFacing,
      confidence: "low",
      actionProposalIds: [],
      policyDecisionId: input.policyDecision.decisionId,
      citations: [],
      composedAt: nowIso(),
      composerVersion: EAI_COMPOSER_VERSION,
    };
  }

  const toneCategory = input.policyDecision.domainBoundary?.toneCategoryId;
  // Always resolve English tone first — localisation is a facing-layer step.
  const tonePrefix = toneCategory ? resolveEaiToneMessage(toneCategory, audience, "en") : "";

  const enterpriseNotes = input.enterpriseResults
    .filter((r) => r.ok)
    .map((r) => `Engine:${r.toolId}`)
    .slice(0, 8);

  const deniedNotes =
    input.policyDecision.deniedToolIds.length > 0
      ? [`Policy denied tools: ${input.policyDecision.deniedToolIds.join(", ")}`]
      : [];

  const proposalNotes =
    input.actionProposals.length > 0
      ? [
          `Action proposals pending review: ${input.actionProposals
            .map((p) => p.kind)
            .join(", ")}`,
        ]
      : [];

  const citations: EaiRegistryRef[] = [];
  for (const result of input.enterpriseResults) {
    const refId = result.payload?.entityId;
    const registry = result.payload?.registry;
    if (typeof refId === "string" && typeof registry === "string") {
      citations.push({ registry, entityId: refId });
    }
  }

  const body = sanitizeFacingText(input.llmOutput);
  const combined = [tonePrefix, body, ...enterpriseNotes, ...deniedNotes, ...proposalNotes]
    .filter(Boolean)
    .join("\n");

  const micro = applyEaiMicroCommunication(combined, "en");
  const facing =
    language === "en"
      ? micro.text
      : localiseEaiResponseFacingText({
          englishFacingText: micro.text,
          language,
          audience,
        }).text;

  return {
    responseId: newId("eai_resp"),
    sessionId: input.sessionId,
    conversationId: input.conversationId,
    text: facing,
    confidence: input.confidence,
    actionProposalIds: input.actionProposals.map((p) => p.proposalId),
    policyDecisionId: input.policyDecision.decisionId,
    citations,
    composedAt: nowIso(),
    composerVersion: EAI_COMPOSER_VERSION,
  };
}
