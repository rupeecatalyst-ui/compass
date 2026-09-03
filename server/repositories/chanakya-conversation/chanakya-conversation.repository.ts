/**
 * CO-C1-CHANAKYA-DURABLE-HISTORY-009A
 * Prisma adapter — PostgreSQL is the production conversation-history SSOT.
 */

import "server-only";

import { prisma, isDatabaseAvailable } from "@server/lib/prisma";
import type { ChanakyaCreditProposalDraft } from "@/types/chanakya-credit-proposal";
import type { ChanakyaConversationEvidenceLink, ChanakyaInterventionCard } from "@/types/chanakya-conversation-intelligence";
import type { ChanakyaInappIntent } from "@/types/chanakya-inapp-conversation";
import type {
  ChanakyaConversationHistoryPorts,
  ChanakyaDurableMessageRecord,
  ChanakyaDurableSessionRecord,
  ChanakyaMessageCompletionStatus,
  ChanakyaMessageStreamStatus,
} from "@/lib/chanakya-inapp-conversation/history-ports";

function migrationPending(): never {
  throw Object.assign(
    new Error("CHANAKYA conversation history storage is prepared but not applied in this environment."),
    { statusCode: 503, code: "CHANAKYA_HISTORY_MIGRATION_PENDING" },
  );
}

function isMissingRelation(err: unknown): boolean {
  const code = typeof err === "object" && err && "code" in err ? String((err as { code?: string }).code) : "";
  const message = err instanceof Error ? err.message : String(err);
  return code === "P2021" || /does not exist/i.test(message) || /ChanakyaConversationSession/i.test(message);
}

function asIntent(value: string | null): ChanakyaInappIntent | null {
  return (value as ChanakyaInappIntent | null) || null;
}

function asMetadata(value: unknown): ChanakyaDurableSessionRecord["metadata"] {
  if (!value || typeof value !== "object") return {};
  const row = value as { unsavedProposal?: { draft: ChanakyaCreditProposalDraft; storedAt: string } | null };
  return { unsavedProposal: row.unsavedProposal ?? null };
}

function asEvidence(value: unknown): ChanakyaConversationEvidenceLink[] {
  return Array.isArray(value) ? (value as ChanakyaConversationEvidenceLink[]) : [];
}

function asEntityRefs(value: unknown): ChanakyaDurableMessageRecord["entityRefs"] {
  if (!value || typeof value !== "object") return {};
  const row = value as { opportunityId?: string | null; dealId?: string | null };
  return { opportunityId: row.opportunityId ?? null, dealId: row.dealId ?? null };
}

function asFocus(value: unknown): ChanakyaInterventionCard[] {
  return Array.isArray(value) ? (value as ChanakyaInterventionCard[]) : [];
}

function mapMessage(row: {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  createdAt: Date;
  sequence: number;
  completionStatus: string;
  streamStatus: string;
  evidenceJson: unknown;
  entityRefsJson: unknown;
  intent: string | null;
  feedback: string | null;
  idempotencyKey: string | null;
  proposalDraftId: string | null;
}): ChanakyaDurableMessageRecord {
  return {
    id: row.id,
    sessionId: row.sessionId,
    role: row.role === "assistant" ? "assistant" : "user",
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    sequence: row.sequence,
    completionStatus: row.completionStatus as ChanakyaMessageCompletionStatus,
    streamStatus: row.streamStatus as ChanakyaMessageStreamStatus,
    evidence: asEvidence(row.evidenceJson),
    entityRefs: asEntityRefs(row.entityRefsJson),
    intent: asIntent(row.intent),
    feedback: row.feedback === "up" || row.feedback === "down" ? row.feedback : null,
    idempotencyKey: row.idempotencyKey,
    proposalDraftId: row.proposalDraftId,
  };
}

function mapSession(
  row: {
    id: string;
    organizationId: string;
    ownerUserId: string;
    title: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    lastMessageAt: Date | null;
    expiresAt: Date;
    opportunityId: string | null;
    dealId: string | null;
    lastIntent: string | null;
    focusEntitiesJson: unknown;
    metadataJson: unknown;
    version: number;
    messages?: Array<Parameters<typeof mapMessage>[0]>;
  },
): ChanakyaDurableSessionRecord {
  return {
    sessionId: row.id,
    organizationId: row.organizationId,
    ownerUserId: row.ownerUserId,
    title: row.title,
    status: "active",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastMessageAt: row.lastMessageAt ? row.lastMessageAt.toISOString() : null,
    expiresAt: row.expiresAt.toISOString(),
    opportunityId: row.opportunityId,
    dealId: row.dealId,
    lastIntent: asIntent(row.lastIntent),
    focusEntities: asFocus(row.focusEntitiesJson),
    metadata: asMetadata(row.metadataJson),
    version: row.version,
    messages: (row.messages ?? []).map(mapMessage).sort((a, b) => a.sequence - b.sequence),
  };
}

async function requireDb<T>(run: () => Promise<T>): Promise<T> {
  if (!isDatabaseAvailable()) migrationPending();
  try {
    return await run();
  } catch (err) {
    if (isMissingRelation(err)) migrationPending();
    throw err;
  }
}

export function createChanakyaHistoryPrismaAdapter(): ChanakyaConversationHistoryPorts {
  return {
    async createSession(row) {
      return requireDb(async () => {
        const created = await prisma.chanakyaConversationSession.create({
          data: {
            id: row.sessionId,
            organizationId: row.organizationId,
            ownerUserId: row.ownerUserId,
            title: row.title,
            status: row.status,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt),
            lastMessageAt: row.lastMessageAt ? new Date(row.lastMessageAt) : null,
            expiresAt: new Date(row.expiresAt),
            opportunityId: row.opportunityId,
            dealId: row.dealId,
            lastIntent: row.lastIntent,
            focusEntitiesJson: row.focusEntities,
            metadataJson: row.metadata,
            version: row.version,
          },
          include: { messages: { orderBy: { sequence: "asc" } } },
        });
        return mapSession(created);
      });
    },
    async findOwnedSession(input) {
      return requireDb(async () => {
        const row = await prisma.chanakyaConversationSession.findFirst({
          where: {
            id: input.sessionId,
            organizationId: input.organizationId,
            ownerUserId: input.ownerUserId,
            ...(input.includeExpired ? {} : { expiresAt: { gt: input.now } }),
          },
          include: { messages: { orderBy: { sequence: "asc" } } },
        });
        return row ? mapSession(row) : null;
      });
    },
    async listOwnedSessions(input) {
      return requireDb(async () => {
        const q = (input.query || "").trim();
        const rows = await prisma.chanakyaConversationSession.findMany({
          where: {
            organizationId: input.organizationId,
            ownerUserId: input.ownerUserId,
            expiresAt: { gt: input.now },
            ...(q
              ? {
                  OR: [
                    { title: { contains: q, mode: "insensitive" } },
                    { messages: { some: { content: { contains: q, mode: "insensitive" } } } },
                  ],
                }
              : {}),
          },
          orderBy: { updatedAt: "desc" },
          take: 40,
          include: { messages: { orderBy: { sequence: "asc" } } },
        });
        return rows.map(mapSession);
      });
    },
    async updateOwnedSession(input, patch) {
      return requireDb(async () => {
        const existing = await prisma.chanakyaConversationSession.findFirst({
          where: {
            id: input.sessionId,
            organizationId: input.organizationId,
            ownerUserId: input.ownerUserId,
            expiresAt: { gt: input.now },
          },
          select: { id: true, version: true },
        });
        if (!existing) return null;
        const updated = await prisma.chanakyaConversationSession.update({
          where: { id: existing.id },
          data: {
            ...(patch.title != null ? { title: patch.title } : {}),
            ...(patch.updatedAt ? { updatedAt: new Date(patch.updatedAt) } : { updatedAt: input.now }),
            ...(patch.lastMessageAt !== undefined
              ? { lastMessageAt: patch.lastMessageAt ? new Date(patch.lastMessageAt) : null }
              : {}),
            ...(patch.expiresAt ? { expiresAt: new Date(patch.expiresAt) } : {}),
            ...(patch.opportunityId !== undefined ? { opportunityId: patch.opportunityId } : {}),
            ...(patch.dealId !== undefined ? { dealId: patch.dealId } : {}),
            ...(patch.lastIntent !== undefined ? { lastIntent: patch.lastIntent } : {}),
            ...(patch.focusEntities ? { focusEntitiesJson: patch.focusEntities } : {}),
            ...(patch.metadata ? { metadataJson: patch.metadata } : {}),
            version: existing.version + 1,
          },
          include: { messages: { orderBy: { sequence: "asc" } } },
        });
        return mapSession(updated);
      });
    },
    async deleteOwnedSession(input) {
      return requireDb(async () => {
        const existing = await prisma.chanakyaConversationSession.findFirst({
          where: {
            id: input.sessionId,
            organizationId: input.organizationId,
            ownerUserId: input.ownerUserId,
          },
          select: { id: true },
        });
        if (!existing) return false;
        await prisma.chanakyaConversationSession.delete({ where: { id: existing.id } });
        return true;
      });
    },
    async insertMessage(row) {
      return requireDb(async () => {
        try {
          const created = await prisma.chanakyaConversationMessage.create({
            data: {
              id: row.id,
              sessionId: row.sessionId,
              role: row.role,
              content: row.content,
              createdAt: new Date(row.createdAt),
              sequence: row.sequence,
              completionStatus: row.completionStatus,
              streamStatus: row.streamStatus,
              evidenceJson: row.evidence,
              entityRefsJson: row.entityRefs,
              intent: row.intent,
              feedback: row.feedback,
              idempotencyKey: row.idempotencyKey,
              proposalDraftId: row.proposalDraftId,
            },
          });
          return mapMessage(created);
        } catch (err) {
          const code = typeof err === "object" && err && "code" in err ? String((err as { code?: string }).code) : "";
          if (code === "P2002" && row.idempotencyKey) {
            const existing = await prisma.chanakyaConversationMessage.findFirst({
              where: { sessionId: row.sessionId, idempotencyKey: row.idempotencyKey },
            });
            if (existing) return mapMessage(existing);
          }
          throw err;
        }
      });
    },
    async findMessageByIdempotency(input) {
      return requireDb(async () => {
        const row = await prisma.chanakyaConversationMessage.findFirst({
          where: { sessionId: input.sessionId, idempotencyKey: input.idempotencyKey },
        });
        return row ? mapMessage(row) : null;
      });
    },
    async updateOwnedMessage(input) {
      return requireDb(async () => {
        const session = await prisma.chanakyaConversationSession.findFirst({
          where: {
            id: input.sessionId,
            organizationId: input.organizationId,
            ownerUserId: input.ownerUserId,
            expiresAt: { gt: input.now },
          },
          select: { id: true },
        });
        if (!session) return false;
        const result = await prisma.chanakyaConversationMessage.updateMany({
          where: { id: input.messageId, sessionId: input.sessionId },
          data: {
            ...(input.patch.feedback !== undefined ? { feedback: input.patch.feedback } : {}),
            ...(input.patch.completionStatus ? { completionStatus: input.patch.completionStatus } : {}),
            ...(input.patch.streamStatus ? { streamStatus: input.patch.streamStatus } : {}),
            ...(input.patch.content !== undefined ? { content: input.patch.content } : {}),
          },
        });
        return result.count > 0;
      });
    },
    async deleteExpiredSessions(input) {
      return requireDb(async () => {
        const expired = await prisma.chanakyaConversationSession.findMany({
          where: { expiresAt: { lte: input.now } },
          select: { id: true },
          take: input.limit,
          orderBy: { expiresAt: "asc" },
        });
        const deletedSessionIds = expired.map((row) => row.id);
        if (deletedSessionIds.length === 0) return { deletedSessionIds };
        await prisma.chanakyaConversationSession.deleteMany({
          where: { id: { in: deletedSessionIds } },
        });
        return { deletedSessionIds };
      });
    },
  };
}
