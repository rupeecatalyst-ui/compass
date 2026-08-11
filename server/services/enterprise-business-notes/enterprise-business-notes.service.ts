/**
 * CO-UX-021 — Enterprise Business Notes service.
 */
import "server-only";

import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { EAR_SOURCE_BUSINESS_NOTES } from "@/constants/enterprise-business-notes";
import { prisma } from "@server/lib/prisma";
import { enterpriseBusinessNotesRepository } from "@server/repositories/enterprise-business-notes/enterprise-business-notes.repository";
import { enterpriseActivityService } from "@server/services/enterprise-activity/enterprise-activity.service";
import type {
  CreateEnterpriseBusinessNoteInput,
  EnterpriseBusinessNote,
  EnterpriseBusinessNoteModification,
  ListEnterpriseBusinessNotesQuery,
  UpdateEnterpriseBusinessNoteInput,
} from "@/types/enterprise-business-notes";

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

function asHistory(raw: unknown): EnterpriseBusinessNoteModification[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (h): h is EnterpriseBusinessNoteModification =>
      Boolean(h) && typeof h === "object" && typeof (h as { at?: unknown }).at === "string",
  );
}

function toDomain(row: {
  id: string;
  organizationId: string;
  body: string;
  category: string;
  workspaceKind: string;
  entityKind: string;
  entityId: string;
  opportunityId: string | null;
  dealId: string | null;
  contactId: string | null;
  lenderId: string | null;
  lenderName: string | null;
  isPinned: boolean;
  modificationHistory: unknown;
  createdByUserId: string;
  createdByName: string | null;
  updatedByUserId: string | null;
  updatedByName: string | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt: Date | null;
}): EnterpriseBusinessNote {
  return {
    id: row.id,
    organizationId: row.organizationId,
    body: row.body,
    category: row.category,
    workspaceKind: row.workspaceKind,
    entityKind: row.entityKind,
    entityId: row.entityId,
    opportunityId: row.opportunityId,
    dealId: row.dealId,
    contactId: row.contactId,
    lenderId: row.lenderId,
    lenderName: row.lenderName,
    isPinned: row.isPinned,
    modificationHistory: asHistory(row.modificationHistory),
    createdByUserId: row.createdByUserId,
    createdByName: row.createdByName,
    updatedByUserId: row.updatedByUserId,
    updatedByName: row.updatedByName,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    isDeleted: row.isDeleted,
    deletedAt: row.deletedAt?.toISOString() ?? null,
  };
}

async function emitEar(note: EnterpriseBusinessNote, action: "created" | "updated" | "soft_deleted") {
  const snippet = note.body.trim().slice(0, 280);
  await enterpriseActivityService.emitBestEffort({
    eventKind: "notes",
    sourceSystem: EAR_SOURCE_BUSINESS_NOTES,
    sourceEventId: `${note.id}:${action}:${note.updatedAt}`,
    title:
      action === "created"
        ? "added a Business Note"
        : action === "soft_deleted"
          ? "removed a Business Note"
          : "updated a Business Note",
    summary: snippet,
    payload: {
      noteId: note.id,
      action,
      category: note.category,
      workspaceKind: note.workspaceKind,
      entityKind: note.entityKind,
      entityId: note.entityId,
      lenderId: note.lenderId,
      lenderName: note.lenderName,
    },
    opportunityId: note.opportunityId,
    dealId: note.dealId,
    contactId: note.contactId,
    actorUserId: note.updatedByUserId ?? note.createdByUserId,
    actorName: note.updatedByName ?? note.createdByName,
    occurredAt: note.updatedAt,
  });
}

export const enterpriseBusinessNotesService = {
  isDurable(): boolean {
    return isEnterprisePersistencePrisma();
  },

  async create(
    input: CreateEnterpriseBusinessNoteInput,
    actor: { userId: string; displayName?: string | null },
  ): Promise<EnterpriseBusinessNote | null> {
    if (!this.isDurable()) return null;
    const body = input.body?.trim();
    if (!body) {
      throw Object.assign(new Error("Note body is required"), {
        statusCode: 400,
        code: "VALIDATION",
      });
    }
    const organizationId = await resolveOrganizationId();
    const row = await enterpriseBusinessNotesRepository.create({
      organizationId,
      body,
      category: input.category ?? "general",
      workspaceKind: input.workspaceKind,
      entityKind: input.entityKind,
      entityId: input.entityId,
      opportunityId: input.opportunityId,
      dealId: input.dealId,
      contactId: input.contactId,
      lenderId: input.lenderId,
      lenderName: input.lenderName,
      isPinned: input.isPinned,
      createdByUserId: actor.userId,
      createdByName: actor.displayName ?? null,
    });

    if (row.isPinned) {
      await enterpriseBusinessNotesRepository.unpinOthers({
        organizationId,
        entityKind: row.entityKind,
        entityId: row.entityId,
        exceptId: row.id,
      });
    }

    const domain = toDomain(row);
    await emitEar(domain, "created");
    return domain;
  },

  async update(
    input: UpdateEnterpriseBusinessNoteInput,
    actor: { userId: string; displayName?: string | null },
  ): Promise<EnterpriseBusinessNote | null> {
    if (!this.isDurable()) return null;
    const organizationId = await resolveOrganizationId();
    const existing = await enterpriseBusinessNotesRepository.findById(
      organizationId,
      input.id,
    );
    if (!existing || existing.isDeleted) {
      throw Object.assign(new Error("Note not found"), {
        statusCode: 404,
        code: "NOT_FOUND",
      });
    }

    const history = asHistory(existing.modificationHistory);
    const nextBody = input.body?.trim();
    const bodyChanging =
      typeof nextBody === "string" && nextBody.length > 0 && nextBody !== existing.body;
    const categoryChanging =
      typeof input.category === "string" &&
      input.category.length > 0 &&
      input.category !== existing.category;

    if (bodyChanging || categoryChanging) {
      history.push({
        at: new Date().toISOString(),
        byUserId: actor.userId,
        byName: actor.displayName ?? null,
        previousBody: existing.body,
        previousCategory: existing.category,
      });
    }

    if (input.softDelete) {
      const row = await enterpriseBusinessNotesRepository.update(existing.id, {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: actor.userId,
        deletionReason: input.deletionReason ?? "Soft delete",
        updatedByUserId: actor.userId,
        updatedByName: actor.displayName ?? null,
        modificationHistory: history,
      });
      const domain = toDomain(row);
      await emitEar(domain, "soft_deleted");
      return domain;
    }

    if (input.isPinned === true) {
      await enterpriseBusinessNotesRepository.unpinOthers({
        organizationId,
        entityKind: existing.entityKind,
        entityId: existing.entityId,
        exceptId: existing.id,
      });
    }

    const row = await enterpriseBusinessNotesRepository.update(existing.id, {
      body: bodyChanging ? nextBody : undefined,
      category: categoryChanging ? input.category : undefined,
      isPinned: typeof input.isPinned === "boolean" ? input.isPinned : undefined,
      updatedByUserId: actor.userId,
      updatedByName: actor.displayName ?? null,
      modificationHistory: history,
    });
    const domain = toDomain(row);
    await emitEar(domain, "updated");
    return domain;
  },

  async list(query: ListEnterpriseBusinessNotesQuery): Promise<EnterpriseBusinessNote[]> {
    if (!this.isDurable()) return [];
    const organizationId = await resolveOrganizationId();
    const rows = await enterpriseBusinessNotesRepository.list({
      organizationId,
      ...query,
    });
    return rows.map(toDomain);
  },
};
