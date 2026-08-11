/**
 * CO-VOICE-002 — Persist conversation activities when Prisma mode is active.
 */
import "server-only";

import { prisma } from "@server/lib/prisma";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import type { EnterpriseConversationActivity } from "@/types/enterprise-conversation-activity";

async function resolveOrganizationId(): Promise<string> {
  const org = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!org) {
    throw Object.assign(new Error("No organization found"), {
      statusCode: 503,
      code: "ORG_MISSING",
    });
  }
  return org.id;
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

  async upsertFromClient(
    input: EnterpriseConversationActivity,
    actorUserId: string,
  ): Promise<EnterpriseConversationActivity> {
    if (!this.isDurable()) {
      return input;
    }
    const organizationId = await resolveOrganizationId();

    const row = await prisma.enterpriseConversationActivity.upsert({
      where: { id: input.id },
      create: {
        id: input.id,
        organizationId,
        activityCode: input.activityCode,
        contextType: input.contextType,
        contextId: input.contextId,
        opportunityId: input.opportunityId ?? null,
        dealId: input.dealId ?? null,
        contactId: input.contactId ?? null,
        loanFileId: input.loanFileId ?? null,
        channel: input.channel,
        status: input.status,
        title: input.title,
        bodyText: input.bodyText ?? null,
        transcriptText: input.transcriptText ?? null,
        transcriptRaw: input.transcriptRaw ?? null,
        transcriptLanguage: input.transcriptLanguage,
        sttProvider: input.sttProvider,
        audioDocumentId: input.audioDocumentId ?? null,
        durationMs: input.durationMs ?? null,
        recordedByUserId: input.recordedByUserId || actorUserId,
        recordedByLabel: input.recordedByLabel ?? null,
        recordedAt: new Date(input.recordedAt),
        savedAt: input.savedAt ? new Date(input.savedAt) : new Date(),
        edcTimelineEntryId: input.edcTimelineEntryId ?? null,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
      update: {
        title: input.title,
        bodyText: input.bodyText ?? null,
        transcriptText: input.transcriptText ?? null,
        transcriptRaw: input.transcriptRaw ?? null,
        transcriptLanguage: input.transcriptLanguage,
        sttProvider: input.sttProvider,
        audioDocumentId: input.audioDocumentId ?? null,
        durationMs: input.durationMs ?? null,
        status: input.status,
        edcTimelineEntryId: input.edcTimelineEntryId ?? null,
        updatedBy: actorUserId,
        savedAt: input.savedAt ? new Date(input.savedAt) : new Date(),
      },
    });

    // CO-ORG-003 — dual-write conversation domain → EAR (idempotent by activity id)
    try {
      const { enterpriseActivityService } = await import(
        "@server/services/enterprise-activity/enterprise-activity.service"
      );
      await enterpriseActivityService.emitBestEffort({
        eventKind: "notes",
        sourceSystem: "ecie",
        sourceEventId: row.id,
        title: row.title,
        summary: (row.transcriptText ?? row.bodyText ?? "").slice(0, 280) || null,
        payload: {
          channel: row.channel,
          contextType: row.contextType,
          contextId: row.contextId,
          edcTimelineEntryId: row.edcTimelineEntryId,
        },
        opportunityId: row.opportunityId,
        dealId: row.dealId,
        contactId: row.contactId,
        documentId: row.audioDocumentId,
        actorUserId: row.recordedByUserId,
        actorName: row.recordedByLabel,
        occurredAt: row.recordedAt,
      });
    } catch {
      /* fail-open */
    }

    return toDomain(row);
  },

  async listByContext(input: {
    contextType: string;
    contextId: string;
  }): Promise<EnterpriseConversationActivity[]> {
    if (!this.isDurable()) return [];
    const organizationId = await resolveOrganizationId();
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
