/**
 * CO-ORG-003 — Enterprise Activity Registry service (durable when prisma mode).
 */
import "server-only";

import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { prisma } from "@server/lib/prisma";
import {
  enterpriseActivityRepository,
  type EarCreateInput,
} from "@server/repositories/enterprise-activity/enterprise-activity.repository";
import type {
  EmitEnterpriseActivityInput,
  EnterpriseActivityEvent,
} from "@/types/enterprise-activity-registry";

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

function toDomain(row: {
  id: string;
  organizationId: string;
  eventKind: string;
  sourceSystem: string;
  sourceEventId: string | null;
  title: string;
  summary: string | null;
  payload: unknown;
  opportunityId: string | null;
  dealId: string | null;
  contactId: string | null;
  taskId: string | null;
  documentId: string | null;
  actorUserId: string | null;
  actorName: string | null;
  occurredAt: Date;
  createdAt: Date;
}): EnterpriseActivityEvent {
  return {
    id: row.id,
    organizationId: row.organizationId,
    eventKind: row.eventKind as EnterpriseActivityEvent["eventKind"],
    sourceSystem: row.sourceSystem,
    sourceEventId: row.sourceEventId,
    title: row.title,
    summary: row.summary,
    payload:
      row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
        ? (row.payload as Record<string, unknown>)
        : null,
    opportunityId: row.opportunityId,
    dealId: row.dealId,
    contactId: row.contactId,
    taskId: row.taskId,
    documentId: row.documentId,
    actorUserId: row.actorUserId,
    actorName: row.actorName,
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export const enterpriseActivityService = {
  isDurable(): boolean {
    return isEnterprisePersistencePrisma();
  },

  async emit(
    input: EmitEnterpriseActivityInput,
  ): Promise<EnterpriseActivityEvent | null> {
    if (!this.isDurable()) return null;
    const organizationId = await resolveOrganizationId();
    const occurredAt =
      input.occurredAt instanceof Date
        ? input.occurredAt
        : new Date(input.occurredAt ?? Date.now());

    const create: EarCreateInput = {
      id: input.id,
      organizationId,
      eventKind: input.eventKind,
      sourceSystem: input.sourceSystem,
      sourceEventId: input.sourceEventId,
      title: input.title,
      summary: input.summary ?? null,
      payload: (input.payload ?? undefined) as EarCreateInput["payload"],
      opportunityId: input.opportunityId ?? null,
      dealId: input.dealId ?? null,
      contactId: input.contactId ?? null,
      taskId: input.taskId ?? null,
      documentId: input.documentId ?? null,
      actorUserId: input.actorUserId ?? null,
      actorName: input.actorName ?? null,
      occurredAt,
    };

    const row = await enterpriseActivityRepository.upsertEvent(create);
    return toDomain(row);
  },

  /** Fail-open dual-write from server domain writers. */
  async emitBestEffort(input: EmitEnterpriseActivityInput): Promise<void> {
    try {
      await this.emit(input);
    } catch {
      /* never block domain mutation */
    }
  },

  async list(query: {
    limit?: number;
    eventKind?: string;
    opportunityId?: string;
    dealId?: string;
    contactId?: string;
    sourceSystem?: string;
    since?: string;
  }): Promise<EnterpriseActivityEvent[]> {
    if (!this.isDurable()) return [];
    const organizationId = await resolveOrganizationId();
    const rows = await enterpriseActivityRepository.list({
      organizationId,
      limit: query.limit,
      eventKind: query.eventKind,
      opportunityId: query.opportunityId,
      dealId: query.dealId,
      contactId: query.contactId,
      sourceSystem: query.sourceSystem,
      since: query.since ? new Date(query.since) : undefined,
    });
    return rows.map(toDomain);
  },
};
