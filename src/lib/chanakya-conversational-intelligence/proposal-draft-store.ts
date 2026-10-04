/**
 * CO-C1-CHANAKYA-CONVERSATIONAL-INTELLIGENCE-009 / CO-C1-CHANAKYA-PROPOSAL-PHASE1-009B
 * Unsaved chat proposal previews are private session metadata and expire with the four-day chat.
 * Phase 1 does not save from CHANAKYA chat. Do not create a second proposal store.
 */

import type { ChanakyaCreditProposalDraft } from "@/types/chanakya-credit-proposal";
import { getChanakyaConversationHistoryPorts } from "@/lib/chanakya-inapp-conversation/history-composition";
import { redactChanakyaPersistText } from "./persist-redact";

function redactDraft(draft: ChanakyaCreditProposalDraft): ChanakyaCreditProposalDraft {
  return {
    ...draft,
    fullText: redactChanakyaPersistText(draft.fullText),
    sections: draft.sections.map((section) => ({
      ...section,
      body: redactChanakyaPersistText(section.body),
    })),
  };
}

export function resetChanakyaChatProposalDraftsForTests(): void {
  /* Unsaved drafts live on the history adapter store. Tests reset that store. */
}

export async function rememberUnsavedChatProposalDraft(input: {
  draft: ChanakyaCreditProposalDraft;
  actorUserId: string;
  organizationId: string;
  sessionId: string;
}): Promise<void> {
  const ports = getChanakyaConversationHistoryPorts();
  const now = new Date();
  const session = await ports.findOwnedSession({
    sessionId: input.sessionId,
    organizationId: input.organizationId,
    ownerUserId: input.actorUserId,
    now,
  });
  if (!session) return;
  await ports.updateOwnedSession(
    {
      sessionId: session.sessionId,
      organizationId: input.organizationId,
      ownerUserId: input.actorUserId,
      now,
    },
    {
      metadata: {
        ...session.metadata,
        unsavedProposal: {
          draft: redactDraft(input.draft),
          storedAt: now.toISOString(),
        },
      },
    },
  );
}

export async function getUnsavedChatProposalDraft(input: {
  draftId: string;
  actorUserId: string;
  organizationId: string;
  sessionId: string;
}): Promise<ChanakyaCreditProposalDraft | null> {
  const ports = getChanakyaConversationHistoryPorts();
  const session = await ports.findOwnedSession({
    sessionId: input.sessionId,
    organizationId: input.organizationId,
    ownerUserId: input.actorUserId,
    now: new Date(),
  });
  const stored = session?.metadata.unsavedProposal;
  if (!stored || stored.draft.draftId !== input.draftId) return null;
  return stored.draft;
}

/** Phase 1: chat cannot create a durable Credit Proposal record. */
export async function saveChanakyaChatProposalDraft(_input: {
  draftId: string;
  actorUserId: string;
  organizationId: string;
  confirmed: boolean;
  sessionId?: string | null;
}): Promise<{ error: "phase1_deferred" }> {
  void _input;
  return { error: "phase1_deferred" };
}

export async function listSavedChanakyaChatProposalDrafts(_input: {
  actorUserId: string;
  organizationId: string;
}): Promise<ChanakyaCreditProposalDraft[]> {
  void _input;
  return [];
}
