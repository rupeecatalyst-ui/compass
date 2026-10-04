/**
 * CO-C1-CHANAKYA-DURABLE-HISTORY-009A
 * Employee-private CHANAKYA conversation history.
 * PostgreSQL is the SSOT. Owner + organisation must both match the authenticated actor.
 * Hierarchy and Super Admin never inherit another employee's chats.
 * Four-day rolling retention. Deleting a chat never mutates Catalyst One business records.
 */


import { createHash } from "node:crypto";
import type {
  ChanakyaInappEntityRefs,
  ChanakyaInappIntent,
  ChanakyaInappMessage,
  ChanakyaInappSession,
} from "@/types/chanakya-inapp-conversation";
import type { ChanakyaConversationEvidenceLink, ChanakyaInterventionCard } from "@/types/chanakya-conversation-intelligence";
import type { ChanakyaConversationSessionSummary } from "@/types/chanakya-conversational-intelligence";
import {
  CHANAKYA_CHAT_OPPORTUNISTIC_CLEANUP_BATCH,
  CHANAKYA_CHAT_CLEANUP_BATCH_SIZE,
} from "@/constants/chanakya-conversational-intelligence";
import { chanakyaChatExpiryFrom } from "@/lib/chanakya-conversational-intelligence/retention";
import {
  redactChanakyaPersistText,
  sanitizeChanakyaEvidenceRefs,
  sanitizeChanakyaFocusEntities,
} from "@/lib/chanakya-conversational-intelligence/persist-redact";
import { sessionBelongsToActor } from "@/lib/chanakya-conversation-intelligence/follow-up";
import type { ChanakyaDurableMessageRecord, ChanakyaDurableSessionRecord } from "./history-ports";
import {
  getChanakyaConversationHistoryPorts,
  resetChanakyaConversationHistoryPortsForTests as resetHistoryPorts,
} from "./history-composition";

function nowIso(now = Date.now()): string {
  return new Date(now).toISOString();
}

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function titleFromText(text: string): string {
  const clean = redactChanakyaPersistText(text).replace(/\s+/g, " ").trim();
  if (!clean) return "New chat";
  return clean.length > 72 ? `${clean.slice(0, 69)}…` : clean;
}

function assertOwnedActor(input: {
  sessionActorUserId: string;
  sessionOrganizationId: string;
  actorUserId: string;
  organizationId: string;
  actorRole?: string | null;
}): void {
  void input.actorRole;
  if (
    !sessionBelongsToActor({
      sessionActorUserId: input.sessionActorUserId,
      sessionOrganizationId: input.sessionOrganizationId,
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
    })
  ) {
    throw Object.assign(new Error("That chat is not available."), {
      statusCode: 404,
      code: "NOT_FOUND",
    });
  }
}

function facingMessages(rows: ChanakyaDurableMessageRecord[]): ChanakyaInappMessage[] {
  return rows
    .filter((row) => {
      if (row.role !== "user" && row.role !== "assistant") return false;
      if (row.completionStatus === "failed") return false;
      if (row.role === "assistant" && row.completionStatus !== "complete") return false;
      if (!row.content.trim()) return false;
      return true;
    })
    .map((row) => ({
      id: row.id,
      role: row.role,
      text: row.content,
      createdAt: row.createdAt,
      intent: row.intent ?? undefined,
      provenance: [],
      availabilityNotes: [],
      entityRefs: row.entityRefs,
      evidence: row.evidence,
      proposalDraftId: row.proposalDraftId,
      feedback: row.feedback,
      completionStatus: row.completionStatus,
    }));
}

function toFacingSession(row: ChanakyaDurableSessionRecord): ChanakyaInappSession {
  return {
    sessionId: row.sessionId,
    actorUserId: row.ownerUserId,
    organizationId: row.organizationId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    title: row.title,
    messages: facingMessages(row.messages),
    activeEntity: {
      opportunityId: row.opportunityId,
      dealId: row.dealId,
    },
    lastIntent: row.lastIntent,
    readOnly: true,
    focusEntities: row.focusEntities,
  };
}

export async function cleanupExpiredChanakyaConversationHistory(input?: {
  now?: Date;
  limit?: number;
}): Promise<{ deletedSessionIds: string[] }> {
  const ports = getChanakyaConversationHistoryPorts();
  return ports.deleteExpiredSessions({
    now: input?.now ?? new Date(),
    limit: input?.limit ?? CHANAKYA_CHAT_CLEANUP_BATCH_SIZE,
  });
}

async function opportunisticCleanup(): Promise<void> {
  try {
    await cleanupExpiredChanakyaConversationHistory({
      limit: CHANAKYA_CHAT_OPPORTUNISTIC_CLEANUP_BATCH,
    });
  } catch {
    /* privacy must not fail the employee request if cleanup is busy */
  }
}

function userTurnIdempotencyKey(input: {
  sessionId: string;
  userText: string;
  completedAssistantCount: number;
  clientKey?: string | null;
}): string {
  if (input.clientKey?.trim()) return input.clientKey.trim().slice(0, 180);
  const digest = createHash("sha256")
    .update(`${input.sessionId}|${input.userText}|${input.completedAssistantCount}`)
    .digest("hex")
    .slice(0, 32);
  return `turn_${digest}`;
}

export function resetChanakyaInappSessionsForTests(): void {
  resetHistoryPorts();
}

export async function createChanakyaInappSession(input: {
  actorUserId: string;
  organizationId: string;
  entity?: ChanakyaInappEntityRefs;
  actorRole?: string | null;
}): Promise<ChanakyaInappSession> {
  void input.actorRole;
  await opportunisticCleanup();
  const createdAt = nowIso();
  const ports = getChanakyaConversationHistoryPorts();
  const row = await ports.createSession({
    sessionId: newId("cky_sess"),
    organizationId: input.organizationId.trim(),
    ownerUserId: input.actorUserId.trim(),
    title: "New chat",
    status: "active",
    createdAt,
    updatedAt: createdAt,
    lastMessageAt: null,
    expiresAt: chanakyaChatExpiryFrom().toISOString(),
    opportunityId: input.entity?.opportunityId?.trim() || null,
    dealId: input.entity?.dealId?.trim() || null,
    lastIntent: null,
    focusEntities: [],
    metadata: {},
    version: 1,
  });
  return toFacingSession(row);
}

export async function resolveChanakyaInappSession(input: {
  sessionId?: string | null;
  actorUserId: string;
  organizationId: string;
  entity?: ChanakyaInappEntityRefs;
  actorRole?: string | null;
}): Promise<ChanakyaInappSession> {
  await opportunisticCleanup();
  const existingId = input.sessionId?.trim();
  if (existingId) {
    const existing = await loadChanakyaInappSessionForActor({
      sessionId: existingId,
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      actorRole: input.actorRole,
    });
    if (existing) return existing;
  }
  return createChanakyaInappSession(input);
}

export async function listChanakyaInappSessionsForActor(input: {
  actorUserId: string;
  organizationId: string;
  query?: string | null;
  actorRole?: string | null;
}): Promise<ChanakyaConversationSessionSummary[]> {
  void input.actorRole;
  await opportunisticCleanup();
  const ports = getChanakyaConversationHistoryPorts();
  const rows = await ports.listOwnedSessions({
    organizationId: input.organizationId.trim(),
    ownerUserId: input.actorUserId.trim(),
    now: new Date(),
    query: input.query,
  });
  return rows.map((session) => {
    const preview =
      facingMessages(session.messages).find((m) => m.role === "assistant")?.text ||
      facingMessages(session.messages).find((m) => m.role === "user")?.text ||
      "";
    return {
      sessionId: session.sessionId,
      title: session.title,
      updatedAt: session.updatedAt,
      createdAt: session.createdAt,
      preview: redactChanakyaPersistText(preview).slice(0, 140),
      messageCount: facingMessages(session.messages).length,
    };
  });
}

export async function loadChanakyaInappSessionForActor(input: {
  sessionId: string;
  actorUserId: string;
  organizationId: string;
  actorRole?: string | null;
}): Promise<ChanakyaInappSession | null> {
  void input.actorRole;
  await opportunisticCleanup();
  const ports = getChanakyaConversationHistoryPorts();
  const row = await ports.findOwnedSession({
    sessionId: input.sessionId,
    organizationId: input.organizationId.trim(),
    ownerUserId: input.actorUserId.trim(),
    now: new Date(),
  });
  if (!row) return null;
  assertOwnedActor({
    sessionActorUserId: row.ownerUserId,
    sessionOrganizationId: row.organizationId,
    actorUserId: input.actorUserId,
    organizationId: input.organizationId,
    actorRole: input.actorRole,
  });
  return toFacingSession(row);
}

/** Deletes only the chat session. Never touches Opportunities, Deals, documents, tasks, or proposals. */
export async function deleteChanakyaInappSessionForActor(input: {
  sessionId: string;
  actorUserId: string;
  organizationId: string;
  actorRole?: string | null;
}): Promise<boolean> {
  void input.actorRole;
  await opportunisticCleanup();
  const ports = getChanakyaConversationHistoryPorts();
  return ports.deleteOwnedSession({
    sessionId: input.sessionId,
    organizationId: input.organizationId.trim(),
    ownerUserId: input.actorUserId.trim(),
    now: new Date(),
  });
}

export async function setChanakyaInappMessageFeedback(input: {
  sessionId: string;
  messageId: string;
  actorUserId: string;
  organizationId: string;
  feedback: "up" | "down" | null;
  actorRole?: string | null;
}): Promise<boolean> {
  void input.actorRole;
  const ports = getChanakyaConversationHistoryPorts();
  const now = new Date();
  return ports.updateOwnedMessage({
    sessionId: input.sessionId,
    messageId: input.messageId,
    organizationId: input.organizationId.trim(),
    ownerUserId: input.actorUserId.trim(),
    now,
    patch: { feedback: input.feedback },
  });
}

async function persistUserMessage(input: {
  session: ChanakyaInappSession;
  userText: string;
  intent: ChanakyaInappIntent;
  entity: ChanakyaInappEntityRefs;
  idempotencyKey?: string | null;
}): Promise<ChanakyaInappMessage> {
  const ports = getChanakyaConversationHistoryPorts();
  const owned = await ports.findOwnedSession({
    sessionId: input.session.sessionId,
    organizationId: input.session.organizationId,
    ownerUserId: input.session.actorUserId,
    now: new Date(),
  });
  if (!owned) {
    throw Object.assign(new Error("That chat is not available."), { statusCode: 404, code: "NOT_FOUND" });
  }
  const completedAssistantCount = owned.messages.filter(
    (row) => row.role === "assistant" && row.completionStatus === "complete",
  ).length;
  const idempotencyKey = userTurnIdempotencyKey({
    sessionId: owned.sessionId,
    userText: input.userText,
    completedAssistantCount,
    clientKey: input.idempotencyKey,
  });
  const existing = await ports.findMessageByIdempotency({
    sessionId: owned.sessionId,
    idempotencyKey,
  });
  if (existing) {
    return facingMessages([existing])[0] ?? {
      id: existing.id,
      role: "user",
      text: existing.content,
      createdAt: existing.createdAt,
      provenance: [],
      availabilityNotes: [],
    };
  }
  const createdAt = nowIso();
  const sequence = owned.messages.reduce((max, row) => Math.max(max, row.sequence), 0) + 1;
  const row = await ports.insertMessage({
    id: newId("cky_msg"),
    sessionId: owned.sessionId,
    role: "user",
    content: redactChanakyaPersistText(input.userText),
    createdAt,
    sequence,
    completionStatus: "complete",
    streamStatus: "idle",
    evidence: [],
    entityRefs: {
      opportunityId: input.entity.opportunityId?.trim() || null,
      dealId: input.entity.dealId?.trim() || null,
    },
    intent: input.intent,
    feedback: null,
    idempotencyKey,
    proposalDraftId: null,
  });
  return facingMessages([row])[0];
}

async function persistAssistantMessage(input: {
  session: ChanakyaInappSession;
  replyText: string;
  intent: ChanakyaInappIntent;
  entity: ChanakyaInappEntityRefs;
  evidence?: ChanakyaConversationEvidenceLink[];
  proposalDraftId?: string | null;
}): Promise<ChanakyaInappMessage | null> {
  const redacted = redactChanakyaPersistText(input.replyText);
  if (!redacted) return null;
  const ports = getChanakyaConversationHistoryPorts();
  const owned = await ports.findOwnedSession({
    sessionId: input.session.sessionId,
    organizationId: input.session.organizationId,
    ownerUserId: input.session.actorUserId,
    now: new Date(),
  });
  if (!owned) return null;
  const createdAt = nowIso();
  const sequence = owned.messages.reduce((max, row) => Math.max(max, row.sequence), 0) + 1;
  const row = await ports.insertMessage({
    id: newId("cky_msg"),
    sessionId: owned.sessionId,
    role: "assistant",
    content: redacted,
    createdAt,
    sequence,
    completionStatus: "complete",
    streamStatus: "completed",
    evidence: sanitizeChanakyaEvidenceRefs(input.evidence),
    entityRefs: {
      opportunityId: input.entity.opportunityId?.trim() || null,
      dealId: input.entity.dealId?.trim() || null,
    },
    intent: input.intent,
    feedback: null,
    idempotencyKey: null,
    proposalDraftId: input.proposalDraftId ?? null,
  });
  return facingMessages([row])[0] ?? null;
}

async function touchSessionAfterTurn(input: {
  session: ChanakyaInappSession;
  userText: string;
  intent: ChanakyaInappIntent;
  entity: ChanakyaInappEntityRefs;
  focusEntities?: ChanakyaInterventionCard[];
}): Promise<ChanakyaInappSession> {
  const ports = getChanakyaConversationHistoryPorts();
  const now = new Date();
  const updated = await ports.updateOwnedSession(
    {
      sessionId: input.session.sessionId,
      organizationId: input.session.organizationId,
      ownerUserId: input.session.actorUserId,
      now,
    },
    {
      title: input.session.title === "New chat" ? titleFromText(input.userText) : input.session.title,
      updatedAt: now.toISOString(),
      lastMessageAt: now.toISOString(),
      expiresAt: chanakyaChatExpiryFrom(now.getTime()).toISOString(),
      opportunityId: input.entity.opportunityId?.trim() || input.session.activeEntity.opportunityId || null,
      dealId: input.entity.dealId?.trim() || input.session.activeEntity.dealId || null,
      lastIntent: input.intent,
      focusEntities: sanitizeChanakyaFocusEntities(input.focusEntities?.length ? input.focusEntities : input.session.focusEntities),
    },
  );
  return updated ? toFacingSession(updated) : input.session;
}

export async function persistChanakyaInappUserMessage(input: {
  session: ChanakyaInappSession;
  userText: string;
  intent: ChanakyaInappIntent;
  entity: ChanakyaInappEntityRefs;
  idempotencyKey?: string | null;
}): Promise<ChanakyaInappMessage> {
  return persistUserMessage(input);
}

export async function appendChanakyaInappTurn(input: {
  session: ChanakyaInappSession;
  userText: string;
  replyText: string;
  intent: ChanakyaInappIntent;
  provenance: string[];
  availabilityNotes: string[];
  entity: ChanakyaInappEntityRefs;
  evidence?: ChanakyaConversationEvidenceLink[];
  focusEntities?: ChanakyaInterventionCard[];
  proposalDraftId?: string | null;
  idempotencyKey?: string | null;
}): Promise<{ user: ChanakyaInappMessage; assistant: ChanakyaInappMessage; session: ChanakyaInappSession }> {
  void input.provenance;
  void input.availabilityNotes;
  const user = await persistUserMessage(input);
  const ports = getChanakyaConversationHistoryPorts();
  const ownedAfterUser = await ports.findOwnedSession({
    sessionId: input.session.sessionId,
    organizationId: input.session.organizationId,
    ownerUserId: input.session.actorUserId,
    now: new Date(),
  });
  const userSeq = ownedAfterUser?.messages.find((row) => row.id === user.id)?.sequence ?? 0;
  const existingAssistant = ownedAfterUser?.messages.find(
    (row) =>
      row.role === "assistant" &&
      row.completionStatus === "complete" &&
      row.sequence > userSeq,
  );
  if (existingAssistant) {
    const session = ownedAfterUser ? toFacingSession(ownedAfterUser) : input.session;
    const assistant = facingMessages([existingAssistant])[0];
    if (!assistant) {
      throw Object.assign(new Error("That chat is not available."), {
        statusCode: 404,
        code: "NOT_FOUND",
      });
    }
    return { user, assistant, session };
  }
  const assistant =
    (await persistAssistantMessage(input)) ??
    ({
      id: newId("cky_msg"),
      role: "assistant" as const,
      text: "",
      createdAt: nowIso(),
      provenance: [],
      availabilityNotes: ["empty_assistant_omitted"],
      completionStatus: "failed" as const,
    } satisfies ChanakyaInappMessage);
  const session = await touchSessionAfterTurn(input);
  const facingAssistant =
    assistant.text.trim().length > 0
      ? assistant
      : {
          ...assistant,
          text: redactChanakyaPersistText(input.replyText),
        };
  return { user, assistant: facingAssistant, session };
}

export async function completeChanakyaInappStreamTurn(input: {
  session: ChanakyaInappSession;
  userText: string;
  replyText: string;
  intent: ChanakyaInappIntent;
  entity: ChanakyaInappEntityRefs;
  evidence?: ChanakyaConversationEvidenceLink[];
  focusEntities?: ChanakyaInterventionCard[];
  proposalDraftId?: string | null;
}): Promise<{ assistant: ChanakyaInappMessage | null; session: ChanakyaInappSession }> {
  const ports = getChanakyaConversationHistoryPorts();
  const owned = await ports.findOwnedSession({
    sessionId: input.session.sessionId,
    organizationId: input.session.organizationId,
    ownerUserId: input.session.actorUserId,
    now: new Date(),
  });
  const lastUser = [...(owned?.messages ?? [])].reverse().find((row) => row.role === "user");
  const existingAssistant = owned?.messages.find(
    (row) =>
      row.role === "assistant" &&
      row.completionStatus === "complete" &&
      (lastUser ? row.sequence > lastUser.sequence : false),
  );
  if (existingAssistant) {
    return {
      assistant: facingMessages([existingAssistant])[0] ?? null,
      session: owned ? toFacingSession(owned) : input.session,
    };
  }
  const assistant = await persistAssistantMessage(input);
  const session = await touchSessionAfterTurn(input);
  return { assistant, session };
}
