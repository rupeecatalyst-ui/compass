/**
 * CO-C1-CONTACT-STRATEGY-STICKY-NOTES-007
 * Private sticky notes — owner queries only. Bodies never logged.
 */

import "server-only";

import { prisma, isDatabaseAvailable } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import {
  actorOwnsStickyNote,
  rejectCrossUserStickyNoteAccess,
  stickyNoteListQueryWhere,
  stickyNoteOwnerWhere,
} from "@/lib/sticky-notes/owner-scope";
import { convertStickyNoteToTaskIdempotent } from "@/lib/sticky-notes/convert-to-task";
import { stickyNoteAuditScalar } from "@/lib/sticky-notes/redact";
import type {
  StickyNoteChecklistItem,
  StickyNoteColor,
  StickyNoteLinkKind,
  StickyNoteListQuery,
  StickyNotePriority,
  StickyNoteRecord,
  StickyNoteUpsertInput,
} from "@/types/sticky-notes";

function isMissingRelation(err: unknown): boolean {
  const code = typeof err === "object" && err && "code" in err ? String((err as { code?: string }).code) : "";
  const message = err instanceof Error ? err.message : String(err);
  return code === "P2021" || /does not exist/i.test(message);
}

function migrationPending(): never {
  throw Object.assign(
    new Error("Sticky Notes storage is prepared but not applied in this environment."),
    { statusCode: 503, code: "STICKY_NOTES_MIGRATION_PENDING" },
  );
}

function asChecklist(value: unknown): StickyNoteChecklistItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const id = String(row.id || "").trim();
      const label = String(row.label || "").trim();
      if (!id || !label) return null;
      return { id, label, done: Boolean(row.done) };
    })
    .filter((item): item is StickyNoteChecklistItem => Boolean(item));
}

function toRecord(row: {
  id: string;
  organizationId: string;
  ownerUserId: string;
  title: string;
  body: string;
  color: string;
  priority: string;
  pinned: boolean;
  sortOrder: number;
  checklistJson: unknown;
  reminderAt: Date | null;
  archivedAt: Date | null;
  linkKind: string | null;
  linkId: string | null;
  linkLabel: string | null;
  convertedTaskId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}): StickyNoteRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    ownerUserId: row.ownerUserId,
    title: row.title,
    body: row.body,
    color: (row.color as StickyNoteColor) || "amber",
    priority: (row.priority as StickyNotePriority) || "normal",
    pinned: row.pinned,
    sortOrder: row.sortOrder,
    checklist: asChecklist(row.checklistJson),
    reminderAt: row.reminderAt?.toISOString() ?? null,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    linkKind: (row.linkKind as StickyNoteLinkKind | null) ?? null,
    linkId: row.linkId,
    linkLabel: row.linkLabel,
    convertedTaskId: row.convertedTaskId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString() ?? null,
  };
}

async function requireScope(actorUserId: string) {
  if (!isDatabaseAvailable()) {
    throw Object.assign(new Error("Sticky Notes require enterprise persistence."), {
      statusCode: 503,
      code: "STICKY_NOTES_UNAVAILABLE",
    });
  }
  const organizationId = await resolvePilotOrganizationId();
  if (!organizationId) {
    throw Object.assign(new Error("Organization context unavailable."), {
      statusCode: 503,
      code: "ORG_CONTEXT_UNAVAILABLE",
    });
  }
  return stickyNoteOwnerWhere({ organizationId, ownerUserId: actorUserId });
}

async function loadOwned(actorUserId: string, actorRole: string | null | undefined, noteId: string) {
  const scope = await requireScope(actorUserId);
  try {
    const row = await prisma.employeePrivateStickyNote.findFirst({
      where: { id: noteId, ...stickyNoteListQueryWhere(scope) },
    });
    if (!row) {
      throw Object.assign(new Error("Sticky note not found."), {
        statusCode: 404,
        code: "STICKY_NOTE_NOT_FOUND",
      });
    }
    rejectCrossUserStickyNoteAccess({
      noteOwnerUserId: row.ownerUserId,
      actorUserId,
      actorRole,
    });
    if (
      !actorOwnsStickyNote({
        organizationId: row.organizationId,
        ownerUserId: row.ownerUserId,
        actorOrganizationId: scope.organizationId,
        actorUserId,
      })
    ) {
      throw Object.assign(new Error("Sticky note not found."), {
        statusCode: 404,
        code: "STICKY_NOTE_NOT_FOUND",
      });
    }
    return { scope, row: toRecord(row) };
  } catch (err) {
    if (isMissingRelation(err)) migrationPending();
    throw err;
  }
}

export const stickyNotesService = {
  auditRef: stickyNoteAuditScalar,

  async list(actorUserId: string, query: StickyNoteListQuery = {}): Promise<StickyNoteRecord[]> {
    const scope = await requireScope(actorUserId);
    const archived = query.archived === true;
    try {
      const rows = await prisma.employeePrivateStickyNote.findMany({
        where: {
          ...stickyNoteListQueryWhere(scope),
          ...(archived
            ? { OR: [{ archivedAt: { not: null } }, { deletedAt: { not: null } }] }
            : { archivedAt: null, deletedAt: null }),
        },
        orderBy: [{ pinned: "desc" }, { sortOrder: "asc" }, { updatedAt: "desc" }],
        take: 200,
      });
      const q = query.q?.trim().toLowerCase() ?? "";
      return rows
        .map(toRecord)
        .filter((note) => {
          if (q) {
            const hay = `${note.title} ${note.body} ${note.linkLabel || ""}`.toLowerCase();
            if (!hay.includes(q)) return false;
          }
          if (query.color && query.color !== "all" && note.color !== query.color) return false;
          if (query.priority && query.priority !== "all" && note.priority !== query.priority) {
            return false;
          }
          if (query.pinned === true && !note.pinned) return false;
          if (query.linkKind && query.linkKind !== "all" && note.linkKind !== query.linkKind) {
            return false;
          }
          return true;
        });
    } catch (err) {
      if (isMissingRelation(err)) migrationPending();
      throw err;
    }
  },

  async create(actorUserId: string, input: StickyNoteUpsertInput): Promise<StickyNoteRecord> {
    const scope = await requireScope(actorUserId);
    try {
      const max = await prisma.employeePrivateStickyNote.aggregate({
        where: stickyNoteListQueryWhere(scope),
        _max: { sortOrder: true },
      });
      const row = await prisma.employeePrivateStickyNote.create({
        data: {
          organizationId: scope.organizationId,
          ownerUserId: scope.ownerUserId,
          title: input.title?.trim() || "Untitled note",
          body: input.body?.trim() || "",
          color: input.color || "amber",
          priority: input.priority || "normal",
          pinned: Boolean(input.pinned),
          sortOrder: (max._max.sortOrder ?? 0) + 1,
          checklistJson: input.checklist ?? [],
          reminderAt: input.reminderAt ? new Date(input.reminderAt) : null,
          linkKind: input.linkKind || null,
          linkId: input.linkId?.trim() || null,
          linkLabel: input.linkLabel?.trim() || null,
        },
      });
      return toRecord(row);
    } catch (err) {
      if (isMissingRelation(err)) migrationPending();
      throw err;
    }
  },

  async update(
    actorUserId: string,
    actorRole: string | null | undefined,
    noteId: string,
    input: StickyNoteUpsertInput,
  ): Promise<StickyNoteRecord> {
    await loadOwned(actorUserId, actorRole, noteId);
    const scope = await requireScope(actorUserId);
    try {
      const updated = await prisma.employeePrivateStickyNote.updateMany({
        where: { id: noteId, ...stickyNoteListQueryWhere(scope) },
        data: {
          ...(input.title != null ? { title: input.title.trim() || "Untitled note" } : {}),
          ...(input.body != null ? { body: input.body } : {}),
          ...(input.color ? { color: input.color } : {}),
          ...(input.priority ? { priority: input.priority } : {}),
          ...(input.pinned != null ? { pinned: Boolean(input.pinned) } : {}),
          ...(input.checklist ? { checklistJson: input.checklist } : {}),
          ...(input.reminderAt !== undefined
            ? { reminderAt: input.reminderAt ? new Date(input.reminderAt) : null }
            : {}),
          ...(input.archived === true ? { archivedAt: new Date() } : {}),
          ...(input.archived === false ? { archivedAt: null } : {}),
          ...(input.linkKind !== undefined ? { linkKind: input.linkKind } : {}),
          ...(input.linkId !== undefined ? { linkId: input.linkId?.trim() || null } : {}),
          ...(input.linkLabel !== undefined ? { linkLabel: input.linkLabel?.trim() || null } : {}),
        },
      });
      if (!updated.count) {
        throw Object.assign(new Error("Sticky note not found."), {
          statusCode: 404,
          code: "STICKY_NOTE_NOT_FOUND",
        });
      }
      const row = await prisma.employeePrivateStickyNote.findFirst({
        where: { id: noteId, ...stickyNoteListQueryWhere(scope) },
      });
      if (!row) {
        throw Object.assign(new Error("Sticky note not found."), {
          statusCode: 404,
          code: "STICKY_NOTE_NOT_FOUND",
        });
      }
      return toRecord(row);
    } catch (err) {
      if (isMissingRelation(err)) migrationPending();
      throw err;
    }
  },

  async archiveOrDelete(
    actorUserId: string,
    actorRole: string | null | undefined,
    noteId: string,
    mode: "archive" | "delete" | "restore",
  ): Promise<StickyNoteRecord> {
    const loaded = await loadOwned(actorUserId, actorRole, noteId);
    try {
      const updated = await prisma.employeePrivateStickyNote.updateMany({
        where: { id: noteId, ...stickyNoteListQueryWhere(loaded.scope) },
        data:
          mode === "delete"
            ? { deletedAt: new Date(), deletedBy: actorUserId }
            : mode === "restore"
              ? { deletedAt: null, deletedBy: null, archivedAt: null }
              : { archivedAt: new Date() },
      });
      if (!updated.count) {
        throw Object.assign(new Error("Sticky note not found."), {
          statusCode: 404,
          code: "STICKY_NOTE_NOT_FOUND",
        });
      }
      const row = await prisma.employeePrivateStickyNote.findFirst({
        where: { id: noteId, ...stickyNoteListQueryWhere(loaded.scope) },
      });
      if (!row) {
        throw Object.assign(new Error("Sticky note not found."), {
          statusCode: 404,
          code: "STICKY_NOTE_NOT_FOUND",
        });
      }
      return toRecord(row);
    } catch (err) {
      if (isMissingRelation(err)) migrationPending();
      throw err;
    }
  },

  async reorder(actorUserId: string, orderedIds: string[]): Promise<void> {
    const scope = await requireScope(actorUserId);
    const unique = [...new Set(orderedIds.map((id) => id.trim()).filter(Boolean))];
    try {
      const owned = await prisma.employeePrivateStickyNote.findMany({
        where: { id: { in: unique }, ...stickyNoteListQueryWhere(scope), deletedAt: null },
        select: { id: true },
      });
      if (owned.length !== unique.length) {
        throw Object.assign(new Error("Sticky note not found."), {
          statusCode: 404,
          code: "STICKY_NOTE_NOT_FOUND",
        });
      }
      await prisma.$transaction(
        unique.map((id, index) =>
          prisma.employeePrivateStickyNote.update({
            where: { id },
            data: { sortOrder: index + 1 },
          }),
        ),
      );
    } catch (err) {
      if (isMissingRelation(err)) migrationPending();
      throw err;
    }
  },

  async convertToTask(input: {
    actorUserId: string;
    actorRole?: string | null;
    actorLabel: string;
    noteId: string;
    confirm: unknown;
  }): Promise<{ note: StickyNoteRecord; taskId: string; created: boolean; confirmationRequired?: boolean }> {
    const loaded = await loadOwned(input.actorUserId, input.actorRole, input.noteId);
    const result = convertStickyNoteToTaskIdempotent({
      note: loaded.row,
      confirm: input.confirm,
      actorUserId: input.actorUserId,
      actorLabel: input.actorLabel,
    });
    if (result.confirmationRequired) {
      return { note: loaded.row, taskId: "", created: false, confirmationRequired: true };
    }
    if (!result.created) {
      return { note: loaded.row, taskId: result.taskId, created: false };
    }
    try {
      const updated = await prisma.employeePrivateStickyNote.updateMany({
        where: { id: input.noteId, ...stickyNoteListQueryWhere(loaded.scope) },
        data: { convertedTaskId: result.taskId },
      });
      if (!updated.count) {
        throw Object.assign(new Error("Sticky note not found."), {
          statusCode: 404,
          code: "STICKY_NOTE_NOT_FOUND",
        });
      }
      const row = await prisma.employeePrivateStickyNote.findFirst({
        where: { id: input.noteId, ...stickyNoteListQueryWhere(loaded.scope) },
      });
      if (!row) {
        throw Object.assign(new Error("Sticky note not found."), {
          statusCode: 404,
          code: "STICKY_NOTE_NOT_FOUND",
        });
      }
      return { note: toRecord(row), taskId: result.taskId, created: true };
    } catch (err) {
      if (isMissingRelation(err)) migrationPending();
      throw err;
    }
  },
};
