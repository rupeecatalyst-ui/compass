/**
 * Session Orchestrator — AI session lifecycle (CO-AI-101).
 * Persona-agnostic. No chat UI. Multi-device continuity keys reserved.
 */

import { getEaiPorts } from "./composition";
import type {
  EaiChannel,
  EaiConversationTurn,
  EaiPersonaPackId,
  EaiSession,
  EaiSessionDeviceHint,
  EaiSessionStatus,
} from "@/types/enterprise-ai-platform";

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export interface CreateEaiSessionInput {
  personaPackId?: EaiPersonaPackId;
  channel?: EaiChannel;
  conversationId?: string;
  continuityKey?: string;
  deviceHint?: EaiSessionDeviceHint;
  metadata?: Record<string, string>;
}

export function createEaiSession(input: CreateEaiSessionInput = {}): EaiSession {
  const ports = getEaiPorts();
  const ts = nowIso();
  const session: EaiSession = {
    sessionId: newId("eai_sess"),
    conversationId: input.conversationId ?? newId("eai_conv"),
    personaPackId: input.personaPackId ?? "platform_none",
    status: "active",
    channel: input.channel ?? "api",
    createdAt: ts,
    updatedAt: ts,
    continuityKey: input.continuityKey,
    deviceHints: input.deviceHint ? [input.deviceHint] : [],
    metadata: input.metadata ?? {},
  };
  ports.sessions.save(session);
  return session;
}

export function getEaiSession(sessionId: string): EaiSession | undefined {
  return getEaiPorts().sessions.findById(sessionId);
}

export function listEaiSessionsByConversation(conversationId: string): EaiSession[] {
  return getEaiPorts().sessions.findByConversationId(conversationId);
}

export function updateEaiSessionStatus(
  sessionId: string,
  status: EaiSessionStatus,
): EaiSession | undefined {
  const ports = getEaiPorts();
  const existing = ports.sessions.findById(sessionId);
  if (!existing) return undefined;
  const ts = nowIso();
  const next: EaiSession = {
    ...existing,
    status,
    updatedAt: ts,
    closedAt: status === "closed" || status === "expired" ? ts : existing.closedAt,
  };
  ports.sessions.save(next);
  return next;
}

export function attachEaiSessionDevice(
  sessionId: string,
  deviceHint: EaiSessionDeviceHint,
): EaiSession | undefined {
  const ports = getEaiPorts();
  const existing = ports.sessions.findById(sessionId);
  if (!existing) return undefined;
  const next: EaiSession = {
    ...existing,
    updatedAt: nowIso(),
    deviceHints: [
      ...existing.deviceHints.filter((d) => d.deviceId !== deviceHint.deviceId),
      deviceHint,
    ],
  };
  ports.sessions.save(next);
  return next;
}

export function appendEaiTurn(input: {
  sessionId: string;
  role: EaiConversationTurn["role"];
  text: string;
}): EaiConversationTurn | undefined {
  const ports = getEaiPorts();
  const session = ports.sessions.findById(input.sessionId);
  if (!session || session.status !== "active") return undefined;
  const turn: EaiConversationTurn = {
    turnId: newId("eai_turn"),
    sessionId: session.sessionId,
    conversationId: session.conversationId,
    role: input.role,
    text: input.text,
    createdAt: nowIso(),
  };
  ports.turns.save(turn);
  ports.sessions.save({ ...session, updatedAt: nowIso() });
  return turn;
}

export function listEaiTurns(sessionId: string): EaiConversationTurn[] {
  return getEaiPorts().turns.listBySession(sessionId);
}
