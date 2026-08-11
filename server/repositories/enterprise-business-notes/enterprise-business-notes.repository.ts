/**
 * CO-UX-021 — Enterprise Business Notes repository.
 */
import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@server/lib/prisma";

export type BusinessNoteCreateData = {
  id?: string;
  organizationId: string;
  body: string;
  category: string;
  workspaceKind: string;
  entityKind: string;
  entityId: string;
  opportunityId?: string | null;
  dealId?: string | null;
  contactId?: string | null;
  lenderId?: string | null;
  lenderName?: string | null;
  isPinned?: boolean;
  createdByUserId: string;
  createdByName?: string | null;
};

export type BusinessNoteListFilter = {
  organizationId: string;
  entityKind?: string;
  entityId?: string;
  opportunityId?: string;
  dealId?: string;
  contactId?: string;
  q?: string;
  includeDeleted?: boolean;
  limit?: number;
};

export const enterpriseBusinessNotesRepository = {
  async create(data: BusinessNoteCreateData) {
    return prisma.enterpriseBusinessNote.create({
      data: {
        id: data.id,
        organizationId: data.organizationId,
        body: data.body,
        category: data.category,
        workspaceKind: data.workspaceKind,
        entityKind: data.entityKind,
        entityId: data.entityId,
        opportunityId: data.opportunityId ?? null,
        dealId: data.dealId ?? null,
        contactId: data.contactId ?? null,
        lenderId: data.lenderId ?? null,
        lenderName: data.lenderName ?? null,
        isPinned: Boolean(data.isPinned),
        createdByUserId: data.createdByUserId,
        createdByName: data.createdByName ?? null,
      },
    });
  },

  async findById(organizationId: string, id: string) {
    return prisma.enterpriseBusinessNote.findFirst({
      where: { id, organizationId },
    });
  },

  async list(filter: BusinessNoteListFilter) {
    const where: Prisma.EnterpriseBusinessNoteWhereInput = {
      organizationId: filter.organizationId,
    };
    if (!filter.includeDeleted) where.isDeleted = false;
    if (filter.entityKind) where.entityKind = filter.entityKind;
    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.opportunityId) where.opportunityId = filter.opportunityId;
    if (filter.dealId) where.dealId = filter.dealId;
    if (filter.contactId) where.contactId = filter.contactId;
    if (filter.q?.trim()) {
      where.body = { contains: filter.q.trim(), mode: "insensitive" };
    }

    return prisma.enterpriseBusinessNote.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: Math.min(Math.max(filter.limit ?? 100, 1), 200),
    });
  },

  async update(
    id: string,
    data: Prisma.EnterpriseBusinessNoteUpdateInput,
  ) {
    return prisma.enterpriseBusinessNote.update({ where: { id }, data });
  },

  async unpinOthers(input: {
    organizationId: string;
    entityKind: string;
    entityId: string;
    exceptId: string;
  }) {
    await prisma.enterpriseBusinessNote.updateMany({
      where: {
        organizationId: input.organizationId,
        entityKind: input.entityKind,
        entityId: input.entityId,
        isPinned: true,
        isDeleted: false,
        NOT: { id: input.exceptId },
      },
      data: { isPinned: false },
    });
  },
};
