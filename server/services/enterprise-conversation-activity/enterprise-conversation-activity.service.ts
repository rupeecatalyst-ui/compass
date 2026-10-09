/**
 * CO-VOICE-002 — Persist conversation activities when Prisma mode is active.
 */
import "server-only";

import { enterpriseActivityRepository } from "@server/repositories/enterprise-activity/enterprise-activity.repository";
import { resolveCaseReadAccess, assertDealReadAccess, assertOpportunityReadAccess } from "@server/services/enterprise-case-visibility/read-access";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { prisma } from "@server/lib/prisma";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import type { EnterpriseConversationActivity } from "@/types/enterprise-conversation-activity";

function failure(statusCode: number, code: string, message: string): never {
  throw Object.assign(new Error(message), { statusCode, code });
}
async function validateContext(input: { contextType: string; contextId: string; dealId?: string | null; opportunityId?: string | null }, userId: string) {
  const access = await resolveCaseReadAccess(userId);
  const dealId = input.dealId || (input.contextType === "deal" ? input.contextId : null);
  let opportunityId = input.opportunityId || (input.contextType === "opportunity" ? input.contextId : null);
  if (dealId) {
    if (input.contextType === "deal" && input.contextId !== dealId) failure(400, "VALIDATION", "Activity Deal context does not match the selected Deal.");
    await assertDealReadAccess(access, dealId);
    const deal = await prisma.enterpriseDeal.findFirst({ where: { id: dealId, organizationId: access.organizationId }, select: { opportunityId: true } });
    if (!deal) failure(404, "DEAL_NOT_FOUND", "Record not found");
    if (opportunityId && opportunityId !== deal.opportunityId) failure(400, "VALIDATION", "Activity Opportunity does not belong to the selected Deal.");
    opportunityId = deal.opportunityId;
    if (input.contextType === "opportunity" && input.contextId !== opportunityId) failure(400, "VALIDATION", "Activity Opportunity context does not match the selected Deal.");
  } else if (opportunityId) await assertOpportunityReadAccess(access, opportunityId);
  return { organizationId: access.organizationId, dealId, opportunityId };
}

function toDomain(
  row: {
    id: string;
    organizationId: string;
    activityCode: string;
    contextType: string;
    contextId: string;
    opportunityId: string | null;
    dealId: string | null;
    contactId: string | null;
    loanFileId: string | null;
    channel: string;
    status: string;
    title: string;
    bodyText: string | null;
    transcriptText: string | null;
    transcriptRaw: string | null;
    transcriptLanguage: string;
    sttProvider: string;
    audioDocumentId: string | null;
    durationMs: number | null;
    recordedByUserId: string;
    recordedByLabel: string | null;
    recordedAt: Date;
    savedAt: Date | null;
    edcTimelineEntryId: string | null;
    createdAt: Date;
    updatedAt: Date;
    isDeleted: boolean;
  },
): EnterpriseConversationActivity {
  return {
    id: row.id,
    organizationId: row.organizationId,
    activityCode: row.activityCode,
    contextType: row.contextType as EnterpriseConversationActivity["contextType"],
    contextId: row.contextId,
    opportunityId: row.opportunityId,
    dealId: row.dealId,
    contactId: row.contactId,
    loanFileId: row.loanFileId,
    channel: row.channel as EnterpriseConversationActivity["channel"],
    status: row.status as EnterpriseConversationActivity["status"],
    title: row.title,
    bodyText: row.bodyText,
    transcriptText: row.transcriptText,
    transcriptRaw: row.transcriptRaw,
    transcriptLanguage:
      row.transcriptLanguage as EnterpriseConversationActivity["transcriptLanguage"],
    sttProvider: row.sttProvider as EnterpriseConversationActivity["sttProvider"],
    audioDocumentId: row.audioDocumentId,
    durationMs: row.durationMs,
    recordedByUserId: row.recordedByUserId,
    recordedByLabel: row.recordedByLabel,
    recordedAt: row.recordedAt.toISOString(),
    savedAt: row.savedAt?.toISOString() ?? null,
    edcTimelineEntryId: row.edcTimelineEntryId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    isDeleted: row.isDeleted,
  };
}

export const enterpriseConversationActivityService = {
  isDurable(): boolean {
    return isEnterprisePersistencePrisma();
  },

  async upsertFromClient(input: EnterpriseConversationActivity, actorUserId: string): Promise<EnterpriseConversationActivity> {
    if (!this.isDurable()) failure(503, "PERSISTENCE_REQUIRED", "Activity saving requires durable enterprise persistence.");
    if (!input.id || !input.activityCode || !input.title?.trim() || !(input.transcriptText || input.bodyText)?.trim()) failure(400, "VALIDATION", "Activity identity, title and note or transcript are required.");
    const scope = await validateContext(input, actorUserId);
    const now = new Date();
    const row = await prisma.$transaction(async tx => {
      const existing = await tx.enterpriseConversationActivity.findUnique({ where: { id: input.id } });
      if (existing && (existing.organizationId !== scope.organizationId || existing.contextType !== input.contextType || existing.contextId !== input.contextId || existing.dealId !== scope.dealId || existing.recordedByUserId !== actorUserId || existing.isDeleted)) failure(409, "ACTIVITY_CONFLICT", "This activity identity belongs to a different or deleted activity.");
      if (existing && ((existing.bodyText ?? "") !== (input.bodyText ?? "") || (existing.transcriptText ?? "") !== (input.transcriptText ?? "") || (existing.audioDocumentId ?? null) !== (input.audioDocumentId ?? null))) failure(409, "ACTIVITY_ALREADY_SAVED", "This activity was already saved. Keep the edited content as a new activity.");
      if (input.audioDocumentId) {
        const audio = await tx.enterpriseTransactionDocument.findFirst({ where: {
          organizationId: scope.organizationId, opportunityId: scope.opportunityId ?? "", dealId: scope.dealId,
          status: "active", OR: [{ id: input.audioDocumentId }, { clientRecordId: input.audioDocumentId }],
        }, select: { mimeType: true, contentBytes: true, storageKey: true } });
        if (!audio || !audio.mimeType.startsWith("audio/") || (!audio.contentBytes?.length && !audio.storageKey)) failure(422, "AUDIO_NOT_PERSISTED", "The audio recording was not stored for this transaction. Your transcript is retained; retry the upload.");
      }
      const saved = await tx.enterpriseConversationActivity.upsert({
        where: { id: input.id },
        create: {
          id: input.id, organizationId: scope.organizationId, activityCode: input.activityCode,
          contextType: input.contextType, contextId: input.contextId,
          opportunityId: scope.opportunityId, dealId: scope.dealId,
          contactId: input.contactId ?? null, loanFileId: input.loanFileId ?? null,
          channel: input.channel, status: "saved", title: input.title,
          bodyText: input.bodyText ?? null, transcriptText: input.transcriptText ?? null,
          transcriptRaw: input.transcriptRaw ?? null, transcriptLanguage: input.transcriptLanguage,
          sttProvider: input.sttProvider, audioDocumentId: input.audioDocumentId ?? null,
          durationMs: input.durationMs ?? null, recordedByUserId: actorUserId,
          recordedByLabel: input.recordedByLabel ?? null, recordedAt: now, savedAt: now,
          edcTimelineEntryId: input.edcTimelineEntryId ?? null, createdBy: actorUserId, updatedBy: actorUserId,
        },
        update: {}, // An identical retry must neither duplicate nor rewrite audit history.
      });
      if (saved.organizationId !== scope.organizationId || saved.contextType !== input.contextType || saved.contextId !== input.contextId || saved.dealId !== scope.dealId || saved.recordedByUserId !== actorUserId || saved.isDeleted) failure(409, "ACTIVITY_CONFLICT", "This activity identity belongs to a different or deleted activity.");
      await enterpriseActivityRepository.upsertEvent({
        organizationId: scope.organizationId, eventKind: "notes", sourceSystem: "ecie", sourceEventId: saved.id,
        title: saved.title, summary: (saved.transcriptText ?? saved.bodyText ?? "").slice(0, 280),
        payload: { channel: saved.channel, contextType: saved.contextType, contextId: saved.contextId, edcTimelineEntryId: saved.edcTimelineEntryId },
        opportunityId: saved.opportunityId, dealId: saved.dealId, contactId: saved.contactId,
        documentId: saved.audioDocumentId, actorUserId: saved.recordedByUserId, actorName: saved.recordedByLabel,
        occurredAt: saved.recordedAt,
      }, tx);
      return saved;
    });
    return toDomain(row);
  },

  async listByContext(input: {
    contextType: string;
    contextId: string;
  }, actorUserId: string): Promise<EnterpriseConversationActivity[]> {
    if (!this.isDurable()) return [];
    await validateContext(input, actorUserId);
    const organizationId = await resolvePilotOrganizationId();
    const rows = await prisma.enterpriseConversationActivity.findMany({
      where: {
        organizationId,
        contextType: input.contextType,
        contextId: input.contextId,
        isDeleted: false,
      },
      orderBy: { recordedAt: "desc" },
      take: 100,
    });
    return rows.map(toDomain);
  },
};
