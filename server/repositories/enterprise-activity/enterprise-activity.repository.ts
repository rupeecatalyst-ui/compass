/**
 * CO-ORG-003 — Enterprise Activity Registry repository.
 */
import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@server/lib/prisma";

export type EarCreateInput = {
  id?: string;
  organizationId: string;
  eventKind: string;
  sourceSystem: string;
  sourceEventId: string;
  title: string;
  summary?: string | null;
  payload?: Prisma.InputJsonValue;
  opportunityId?: string | null;
  dealId?: string | null;
  contactId?: string | null;
  taskId?: string | null;
  documentId?: string | null;
  actorUserId?: string | null;
  actorName?: string | null;
  occurredAt: Date;
};

export type EarListFilter = {
  organizationId: string;
  limit?: number;
  eventKind?: string;
  opportunityId?: string;
  dealId?: string;
  contactId?: string;
  sourceSystem?: string;
  since?: Date;
};

export const enterpriseActivityRepository = {
  async upsertEvent(input: EarCreateInput) {
    return prisma.enterpriseActivityEvent.upsert({
      where: {
        organizationId_sourceSystem_sourceEventId: {
          organizationId: input.organizationId,
          sourceSystem: input.sourceSystem,
          sourceEventId: input.sourceEventId,
        },
      },
      create: {
        id: input.id,
        organizationId: input.organizationId,
        eventKind: input.eventKind,
        sourceSystem: input.sourceSystem,
        sourceEventId: input.sourceEventId,
        title: input.title,
        summary: input.summary ?? null,
        payload: input.payload ?? undefined,
        opportunityId: input.opportunityId ?? null,
        dealId: input.dealId ?? null,
        contactId: input.contactId ?? null,
        taskId: input.taskId ?? null,
        documentId: input.documentId ?? null,
        actorUserId: input.actorUserId ?? null,
        actorName: input.actorName ?? null,
        occurredAt: input.occurredAt,
      },
      update: {
        title: input.title,
        summary: input.summary ?? null,
        payload: input.payload ?? undefined,
        opportunityId: input.opportunityId ?? null,
        dealId: input.dealId ?? null,
        contactId: input.contactId ?? null,
        taskId: input.taskId ?? null,
        documentId: input.documentId ?? null,
        actorUserId: input.actorUserId ?? null,
        actorName: input.actorName ?? null,
        occurredAt: input.occurredAt,
        eventKind: input.eventKind,
      },
    });
  },

  async list(filter: EarListFilter) {
    const where: Prisma.EnterpriseActivityEventWhereInput = {
      organizationId: filter.organizationId,
    };
    if (filter.eventKind) where.eventKind = filter.eventKind;
    if (filter.opportunityId) where.opportunityId = filter.opportunityId;
    if (filter.dealId) where.dealId = filter.dealId;
    if (filter.contactId) where.contactId = filter.contactId;
    if (filter.sourceSystem) where.sourceSystem = filter.sourceSystem;
    if (filter.since) where.occurredAt = { gte: filter.since };

    return prisma.enterpriseActivityEvent.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      take: Math.min(Math.max(filter.limit ?? 50, 1), 200),
    });
  },
};
