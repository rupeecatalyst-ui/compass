/**
 * CO-C1-CONTACT-STRATEGY-STICKY-NOTES-007 — convert private note to ETE task.
 * Requires confirm: true. Idempotent via convertedTaskId.
 */

import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { recordBusinessAudit } from "@/lib/ops/record";
import { stickyNotesService } from "@server/services/sticky-notes/sticky-notes.service";
import { STICKY_NOTE_CONVERT_CONFIRMATION } from "@/types/sticky-notes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ noteId: string }> },
) {
  try {
    const actor = requireAccessToken(request);
    const { noteId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { confirm?: unknown };
    const result = await stickyNotesService.convertToTask({
      actorUserId: actor.userId,
      actorRole: actor.role,
      actorLabel: "RC employee",
      noteId,
      confirm: body.confirm,
    });
    if (result.confirmationRequired) {
      return successResponse({
        confirmationRequired: true,
        confirmation: STICKY_NOTE_CONVERT_CONFIRMATION,
      });
    }
    recordBusinessAudit({
      actorUserId: actor.userId,
      module: "Customer",
      action: "sticky-note.convert-to-task",
      entityId: noteId,
      previousValue: null,
      newValue: result.taskId,
      result: "Success",
    });
    return successResponse({
      note: result.note,
      taskId: result.taskId,
      created: result.created,
    });
  } catch (err) {
    if (typeof err === "object" && err && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    const status = Number((err as { statusCode?: number }).statusCode) || 500;
    return errorResponse(
      status,
      (err as { code?: string }).code || "STICKY_NOTE_CONVERT_FAILED",
      err instanceof Error ? err.message : "Failed to convert sticky note",
    );
  }
}
