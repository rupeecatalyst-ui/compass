/**
 * CO-C1-CHANAKYA-CONVERSATIONAL-INTELLIGENCE-009
 * Phase 1 conversational workspace contracts — not a second intelligence store.
 */

import type { ChanakyaCreditProposalDraft } from "@/types/chanakya-credit-proposal";
import type { ChanakyaInappMessage, ChanakyaInappTurnResult } from "@/types/chanakya-inapp-conversation";

export const CHANAKYA_CONVERSATIONAL_INTELLIGENCE_SPRINT =
  "CO-C1-CHANAKYA-CONVERSATIONAL-INTELLIGENCE-009" as const;

export type ChanakyaPhase1DomainKind =
  | "catalyst_one"
  | "out_of_domain"
  | "mixed"
  | "prompt_injection"
  | "web_research";

export type ChanakyaPhase1DomainDecision = {
  kind: ChanakyaPhase1DomainKind;
  catalystOnePortion: string | null;
  unsupportedPortion: string | null;
};

export type ChanakyaSuggestedQuestionGroupId =
  | "today"
  | "transactions"
  | "documents"
  | "lenders_products"
  | "analysis";

export type ChanakyaSuggestedQuestion = {
  id: string;
  group: ChanakyaSuggestedQuestionGroupId;
  label: string;
};

export type ChanakyaConversationSessionSummary = {
  sessionId: string;
  title: string;
  updatedAt: string;
  createdAt: string;
  preview: string;
  messageCount: number;
};

export type ChanakyaConversationStreamEvent =
  | { type: "session"; sessionId: string }
  | { type: "delta"; text: string }
  | {
      type: "done";
      result: ChanakyaInappTurnResult;
    }
  | {
      type: "proposal";
      draft: ChanakyaCreditProposalDraft;
      saved: false;
    }
  | { type: "error"; message: string }
  | { type: "cancelled" };

export type ChanakyaProposalChatAction =
  | "copy"
  | "preview"
  | "download"
  | "open_workspace";

export type ChanakyaInappMessageExtras = {
  proposalDraftId?: string | null;
  proposalActions?: ChanakyaProposalChatAction[];
  feedback?: "up" | "down" | null;
};

export type ChanakyaConversationalMessage = ChanakyaInappMessage & ChanakyaInappMessageExtras;
