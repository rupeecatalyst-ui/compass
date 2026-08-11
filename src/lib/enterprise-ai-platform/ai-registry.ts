/**
 * Enterprise AI Registry framework — interaction recording (CO-AI-101).
 * In-memory by default; production persistence is a later sprint.
 */

import { getEaiPorts } from "./composition";
import type {
  EaiConfidenceBand,
  EaiInteractionOutcome,
  EaiInteractionRecord,
  EaiPersonaPackId,
} from "@/types/enterprise-ai-platform";

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export interface RecordEaiInteractionInput {
  conversationId: string;
  sessionId: string;
  personaPackId: EaiPersonaPackId;
  intentHint?: string;
  contextSnapshotRef?: string;
  recommendation?: string;
  confidence?: EaiConfidenceBand;
  actionProposalIds?: string[];
  outcome?: EaiInteractionOutcome;
  actorId?: string;
  notes?: string[];
}

export function recordEaiInteraction(
  input: RecordEaiInteractionInput,
): EaiInteractionRecord {
  const record: EaiInteractionRecord = {
    interactionId: newId("eai_ix"),
    conversationId: input.conversationId,
    sessionId: input.sessionId,
    personaPackId: input.personaPackId,
    intentHint: input.intentHint,
    contextSnapshotRef: input.contextSnapshotRef,
    recommendation: input.recommendation,
    confidence: input.confidence ?? "unspecified",
    actionProposalIds: input.actionProposalIds ?? [],
    outcome: input.outcome ?? "recorded",
    audit: {
      recordedAt: nowIso(),
      actorId: input.actorId,
      notes: input.notes,
    },
  };
  getEaiPorts().interactions.save(record);
  return record;
}

export function getEaiInteraction(interactionId: string): EaiInteractionRecord | undefined {
  return getEaiPorts().interactions.findById(interactionId);
}

export function listEaiInteractionsByConversation(
  conversationId: string,
): EaiInteractionRecord[] {
  return getEaiPorts().interactions.listByConversation(conversationId);
}
