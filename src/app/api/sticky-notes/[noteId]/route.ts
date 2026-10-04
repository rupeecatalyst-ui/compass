/**
 * CO-C1-CONTACT-STRATEGY-STICKY-NOTES-007 — owner-scoped sticky note mutations.
 */

import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { recordBusinessAudit } from "@/lib/ops/record";
import { stickyNotesService } from "@server/services/sticky-notes/sticky-notes.service";
import type { StickyNoteUpsertInput } from "@/types/sticky-notes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ noteId: string }> },
) {
  try {
    const actor = requireAccessToken(request);
    const { noteId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as StickyNoteUpsertInput;
    const note = await stickyNotesService.update(actor.userId, actor.role, noteId, body);
    recordBusinessAudit({
      actorUserId: actor.userId,
      module: "Customer",
      action: "sticky-note.update",
      entityId: noteId,
      previousValue: null,
      newValue: stickyNotesService.auditRef(noteId),
      result: "Success",
    });
    return successResponse(note);
  } catch (err) {
    if (typeof err === "object" && err && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    const status = Number((err as { statusCode?: number }).statusCode) || 500;
    return errorResponse(
      status,
      (err as { code?: string }).code || "STICKY_NOTE_UPDATE_FAILED",
      err instanceof Error ? err.message : "Failed to update sticky note",
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ noteId: string }> },
) {
  try {
    const actor = requireAccessToken(request);
    const { noteId } = await context.params;
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") === "restore" ? "restore" : url.searchParams.get("mode") === "archive" ? "archive" : "delete";
    const note = await stickyNotesService.archiveOrDelete(actor.userId, actor.role, noteId, mode);
    recordBusinessAudit({
      actorUserId: actor.userId,
      module: "Customer",
      action: `sticky-note.${mode}`,
      entityId: noteId,
      previousValue: null,
      newValue: stickyNotesService.auditRef(noteId),
      result: "Success",
    });
    return successResponse(note);
  } catch (err) {
    if (typeof err === "object" && err && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    const status = Number((err as { statusCode?: number }).statusCode) || 500;
    return errorResponse(
      status,
      (err as { code?: string }).code || "STICKY_NOTE_DELETE_FAILED",
      err instanceof Error ? err.message : "Failed to update sticky note",
    );
  }
}
