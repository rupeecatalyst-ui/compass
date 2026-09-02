/**
 * CO-C1-CHANAKYA-REALTIME-INTELLIGENCE-001
 * Generate a user-facing CHANAKYA answer from the shared grounding brief.
 */

import {
  CHANAKYA_CONTEXT_MISSING_MESSAGE,
  CHANAKYA_CONVERSATION_SYSTEM_PROMPT,
  CHANAKYA_MUTATION_REFUSED_MESSAGE,
  CHANAKYA_TEMPORARY_UNAVAILABLE_MESSAGE,
} from "@/constants/chanakya-conversation-intelligence";
import type {
  ChanakyaConversationEvidenceLink,
  ChanakyaConversationModelStatus,
  ChanakyaGroundingBrief,
} from "@/types/chanakya-conversation-intelligence";
import { redactFacingIntelligenceText } from "./facing-redact";
import { getChanakyaConversationModelPort } from "./model-port";

export type ChanakyaGeneratedAnswer = {
  text: string;
  modelStatus: ChanakyaConversationModelStatus;
  evidence: ChanakyaConversationEvidenceLink[];
  freshness: string | null;
  diagnostics: { reason: string } | null;
};

function evidenceFromBrief(brief: ChanakyaGroundingBrief): ChanakyaConversationEvidenceLink[] {
  return brief.interventionCards.slice(0, 8).map((card) => ({
    label: [card.dealRef || card.opportunityRef, card.customerName, card.stage]
      .filter(Boolean)
      .join(" · "),
    href: card.href,
    opportunityRef: card.opportunityRef,
    dealRef: card.dealRef,
    stage: card.stage,
    lastUpdated: card.lastUpdated,
    freshness: card.freshness,
  }));
}

function buildUserPrompt(input: {
  question: string;
  brief: ChanakyaGroundingBrief;
  entityRequiredMissing: boolean;
}): string {
  return [
    `Employee question: ${input.question}`,
    input.entityRequiredMissing ? "Case context is missing." : "",
    "Grounding brief (authorised, privacy-redacted, live operational evidence):",
    JSON.stringify(input.brief),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function generateChanakyaConversationAnswer(input: {
  question: string;
  brief: ChanakyaGroundingBrief;
  history: Array<{ role: "user" | "assistant"; text: string }>;
  mutationRefused: boolean;
  entityRequiredMissing: boolean;
  dataUnavailable: boolean;
}): Promise<ChanakyaGeneratedAnswer> {
  const evidence = input.dataUnavailable ? [] : evidenceFromBrief(input.brief);
  const freshness = input.brief.freshnessLabel;

  if (input.mutationRefused) {
    return {
      text: CHANAKYA_MUTATION_REFUSED_MESSAGE,
      modelStatus: "refused",
      evidence: [],
      freshness,
      diagnostics: { reason: "mutation_refused" },
    };
  }

  if (input.dataUnavailable) {
    return {
      text: CHANAKYA_TEMPORARY_UNAVAILABLE_MESSAGE,
      modelStatus: "unavailable",
      evidence: [],
      freshness: null,
      diagnostics: { reason: "data_unavailable" },
    };
  }

  if (input.entityRequiredMissing) {
    return {
      text: CHANAKYA_CONTEXT_MISSING_MESSAGE,
      modelStatus: "context_missing",
      evidence: [],
      freshness,
      diagnostics: null,
    };
  }

  const port = getChanakyaConversationModelPort();
  let raw: string | null = null;
  try {
    raw = await port.generate({
      systemPrompt: CHANAKYA_CONVERSATION_SYSTEM_PROMPT,
      userPrompt: buildUserPrompt({
        question: input.question,
        brief: input.brief,
        entityRequiredMissing: input.entityRequiredMissing,
      }),
      history: input.history.map((turn) => ({
        role: turn.role,
        text: redactFacingIntelligenceText(turn.text),
      })),
    });
  } catch {
    raw = null;
  }

  if (!raw?.trim()) {
    return {
      text: CHANAKYA_TEMPORARY_UNAVAILABLE_MESSAGE,
      modelStatus: "unavailable",
      evidence: [],
      freshness: null,
      diagnostics: { reason: "model_unavailable" },
    };
  }

  return {
    text: redactFacingIntelligenceText(raw),
    modelStatus: "generated",
    evidence,
    freshness,
    diagnostics: null,
  };
}
