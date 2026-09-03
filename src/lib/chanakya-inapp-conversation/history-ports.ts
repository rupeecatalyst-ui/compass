/**
 * CO-C1-CHANAKYA-DURABLE-HISTORY-009A
 * Repository port for employee-private CHANAKYA conversation history.
 * PostgreSQL is the production SSOT. Tests inject an adapter over an external store.
 */

import type { ChanakyaConversationEvidenceLink, ChanakyaInterventionCard } from "@/types/chanakya-conversation-intelligence";
import type { ChanakyaInappIntent } from "@/types/chanakya-inapp-conversation";
import type { ChanakyaCreditProposalDraft } from "@/types/chanakya-credit-proposal";

export type ChanakyaMessageCompletionStatus = "pending" | "complete" | "cancelled" | "failed";
export type ChanakyaMessageStreamStatus = "idle" | "streaming" | "completed" | "cancelled" | "failed";

export type ChanakyaDurableMessageRecord = {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  sequence: number;
  completionStatus: ChanakyaMessageCompletionStatus;
  streamStatus: ChanakyaMessageStreamStatus;
  evidence: ChanakyaConversationEvidenceLink[];
  entityRefs: { opportunityId?: string | null; dealId?: string | null };
  intent: ChanakyaInappIntent | null;
  feedback: "up" | "down" | null;
  idempotencyKey: string | null;
  proposalDraftId: string | null;
};

export type ChanakyaDurableSessionRecord = {
  sessionId: string;
  organizationId: string;
  ownerUserId: string;
  title: string;
  status: "active";
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  expiresAt: string;
  opportunityId: string | null;
  dealId: string | null;
  lastIntent: ChanakyaInappIntent | null;
  focusEntities: ChanakyaInterventionCard[];
  metadata: {
    unsavedProposal?: { draft: ChanakyaCreditProposalDraft; storedAt: string } | null;
  };
  version: number;
  messages: ChanakyaDurableMessageRecord[];
};

export type ChanakyaOwnedScope = {
  sessionId?: string;
  organizationId: string;
  ownerUserId: string;
};

export type ChanakyaConversationHistoryPorts = {
  createSession(row: Omit<ChanakyaDurableSessionRecord, "messages">): Promise<ChanakyaDurableSessionRecord>;
  findOwnedSession(input: {
    sessionId: string;
    organizationId: string;
    ownerUserId: string;
    now: Date;
    includeExpired?: boolean;
  }): Promise<ChanakyaDurableSessionRecord | null>;
  listOwnedSessions(input: {
    organizationId: string;
    ownerUserId: string;
    now: Date;
    query?: string | null;
  }): Promise<ChanakyaDurableSessionRecord[]>;
  updateOwnedSession(
    input: ChanakyaOwnedScope & { now: Date },
    patch: Partial<
      Pick<
        ChanakyaDurableSessionRecord,
        | "title"
        | "updatedAt"
        | "lastMessageAt"
        | "expiresAt"
        | "opportunityId"
        | "dealId"
        | "lastIntent"
        | "focusEntities"
        | "metadata"
        | "version"
      >
    >,
  ): Promise<ChanakyaDurableSessionRecord | null>;
  deleteOwnedSession(input: ChanakyaOwnedScope & { now: Date }): Promise<boolean>;
  insertMessage(row: ChanakyaDurableMessageRecord): Promise<ChanakyaDurableMessageRecord>;
  findMessageByIdempotency(input: {
    sessionId: string;
    idempotencyKey: string;
  }): Promise<ChanakyaDurableMessageRecord | null>;
  updateOwnedMessage(input: {
    sessionId: string;
    messageId: string;
    organizationId: string;
    ownerUserId: string;
    now: Date;
    patch: Partial<Pick<ChanakyaDurableMessageRecord, "feedback" | "completionStatus" | "streamStatus" | "content">>;
  }): Promise<boolean>;
  deleteExpiredSessions(input: { now: Date; limit: number }): Promise<{ deletedSessionIds: string[] }>;
};
