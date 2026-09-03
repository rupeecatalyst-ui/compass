/**
 * CO-C1-CHANAKYA-CONVERSATIONAL-INTELLIGENCE-009
 * Chat Make Proposal — reuses Credit Workbench gather + compose. No parallel analyzer.
 * Generating / previewing / opening the workspace does not write a business record.
 * Phase 1 chat Save as Draft is deferred (CO-C1-CHANAKYA-PROPOSAL-PHASE1-009B).
 */

import "server-only";

import { composeChanakyaCreditProposalDraft } from "@/lib/chanakya-credit-proposal/compose-proposal";
import { gatherChanakyaCreditProposalContext } from "@/lib/chanakya-credit-proposal/gather-context";
import { redactFacingIntelligenceText } from "@/lib/chanakya-conversation-intelligence/facing-redact";
import type { ChanakyaCreditProposalDraft } from "@/types/chanakya-credit-proposal";

export { isChanakyaMakeProposalRequest } from "./proposal-detect";
export {
  rememberUnsavedChatProposalDraft,
  getUnsavedChatProposalDraft,
  saveChanakyaChatProposalDraft,
  listSavedChanakyaChatProposalDrafts,
  resetChanakyaChatProposalDraftsForTests,
} from "./proposal-draft-store";

export async function generateChanakyaChatProposalDraft(input: {
  opportunityId: string;
  dealId?: string | null;
}): Promise<ChanakyaCreditProposalDraft> {
  void input.dealId;
  const ctx = await gatherChanakyaCreditProposalContext({
    opportunityId: input.opportunityId,
    lenderName: null,
  });
  const draft = composeChanakyaCreditProposalDraft(ctx);
  return {
    ...draft,
    fullText: redactFacingIntelligenceText(draft.fullText),
    sections: draft.sections.map((section) => ({
      ...section,
      body: redactFacingIntelligenceText(section.body),
    })),
  };
}
