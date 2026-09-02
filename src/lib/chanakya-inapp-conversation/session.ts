/**
 * CO-CHANAKYA-037 — In-memory multi-turn session store (server process).
 * Advisory conversation only — not a business SSOT.
 */

import "server-only";

import type {
  ChanakyaInappEntityRefs,
  ChanakyaInappIntent,
  ChanakyaInappMessage,
  ChanakyaInappSession,
} from "@/types/chanakya-inapp-conversation";
import type { ChanakyaConversationEvidenceLink, ChanakyaInterventionCard } from "@/types/chanakya-conversation-intelligence";
import { redactFacingIntelligenceText } from "@/lib/chanakya-conversation-intelligence/facing-redact";
import { sessionBelongsToActor } from "@/lib/chanakya-conversation-intelligence/follow-up";

const sessions = new Map<string, ChanakyaInappSession>();

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function resetChanakyaInappSessionsForTests(): void {
  sessions.clear();
}

export function getChanakyaInappSession(sessionId: string): ChanakyaInappSession | null {
  return sessions.get(sessionId) ?? null;
}

export function createChanakyaInappSession(input: {
  actorUserId: string;
  organizationId: string;
  entity?: ChanakyaInappEntityRefs;
}): ChanakyaInappSession {
  const createdAt = nowIso();
  const session: ChanakyaInappSession = {
    sessionId: newId("cky_sess"),
    actorUserId: input.actorUserId,
    organizationId: input.organizationId,
    createdAt,
    updatedAt: createdAt,
    messages: [],
    activeEntity: {
      opportunityId: input.entity?.opportunityId?.trim() || null,
      dealId: input.entity?.dealId?.trim() || null,
    },
    lastIntent: null,
    readOnly: true,
    focusEntities: [],
  };
  sessions.set(session.sessionId, session);
  return session;
}

export function resolveChanakyaInappSession(input: {
  sessionId?: string | null;
  actorUserId: string;
  organizationId: string;
  entity?: ChanakyaInappEntityRefs;
}): ChanakyaInappSession {
  const existingId = input.sessionId?.trim();
  if (existingId) {
    const existing = sessions.get(existingId);
    if (
      existing &&
      sessionBelongsToActor({
        sessionActorUserId: existing.actorUserId,
        sessionOrganizationId: existing.organizationId,
        actorUserId: input.actorUserId,
        organizationId: input.organizationId,
      })
    ) {
      return existing;
    }
  }
  return createChanakyaInappSession(input);
}

export function appendChanakyaInappTurn(input: {
  session: ChanakyaInappSession;
  userText: string;
  replyText: string;
  intent: ChanakyaInappIntent;
  provenance: string[];
  availabilityNotes: string[];
  entity: ChanakyaInappEntityRefs;
  evidence?: ChanakyaConversationEvidenceLink[];
  focusEntities?: ChanakyaInterventionCard[];
}): { user: ChanakyaInappMessage; assistant: ChanakyaInappMessage } {
  const createdAt = nowIso();
  const user: ChanakyaInappMessage = {
    id: newId("cky_msg"),
    role: "user",
    text: redactFacingIntelligenceText(input.userText),
    createdAt,
    intent: input.intent,
    provenance: [],
    availabilityNotes: [],
    entityRefs: input.entity,
  };
  const assistant: ChanakyaInappMessage = {
    id: newId("cky_msg"),
    role: "assistant",
    text: redactFacingIntelligenceText(input.replyText),
    createdAt: nowIso(),
    intent: input.intent,
    provenance: [],
    availabilityNotes: [],
    entityRefs: input.entity,
    evidence: input.evidence ?? [],
  };

  input.session.messages.push(user, assistant);
  // Cap history to keep process memory bounded
  if (input.session.messages.length > 40) {
    input.session.messages = input.session.messages.slice(-40);
  }
  input.session.updatedAt = nowIso();
  input.session.lastIntent = input.intent;
  if (input.entity.opportunityId?.trim()) {
    input.session.activeEntity.opportunityId = input.entity.opportunityId.trim();
  }
  if (input.entity.dealId?.trim()) {
    input.session.activeEntity.dealId = input.entity.dealId.trim();
  }
  if (input.focusEntities && input.focusEntities.length > 0) {
    input.session.focusEntities = input.focusEntities;
  }
  sessions.set(input.session.sessionId, input.session);
  return { user, assistant };
}
