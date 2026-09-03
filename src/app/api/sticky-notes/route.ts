/**
 * CO-C1-CONTACT-STRATEGY-STICKY-NOTES-007 — private sticky notes (owner-only).
 */

import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { recordBusinessAudit } from "@/lib/ops/record";
import { stickyNotesService } from "@server/services/sticky-notes/sticky-notes.service";
import type { StickyNoteColor, StickyNoteLinkKind, StickyNotePriority } from "@/types/sticky-notes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    const url = new URL(request.url);
    const notes = await stickyNotesService.list(actor.userId, {
      q: url.searchParams.get("q") ?? undefined,
      color: (url.searchParams.get("color") as StickyNoteColor | "all") || "all",
      priority: (url.searchParams.get("priority") as StickyNotePriority | "all") || "all",
      pinned: url.searchParams.get("pinned") === "1" ? true : "all",
      archived: url.searchParams.get("archived") === "1",
      linkKind: (url.searchParams.get("linkKind") as StickyNoteLinkKind | "all") || "all",
    });
    return successResponse({ notes });
  } catch (err) {
    if (typeof err === "object" && err && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    const status = Number((err as { statusCode?: number }).statusCode) || 500;
    return errorResponse(
      status,
      (err as { code?: string }).code || "STICKY_NOTES_FAILED",
      err instanceof Error ? err.message : "Failed to load sticky notes",
    );
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireAccessToken(request);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const note = await stickyNotesService.create(actor.userId, {
      title: typeof body.title === "string" ? body.title : "",
      body: typeof body.body === "string" ? body.body : "",
      color: body.color as StickyNoteColor | undefined,
      priority: body.priority as StickyNotePriority | undefined,
      pinned: Boolean(body.pinned),
      checklist: Array.isArray(body.checklist) ? body.checklist : [],
      reminderAt: typeof body.reminderAt === "string" ? body.reminderAt : null,
      linkKind: (body.linkKind as StickyNoteLinkKind | null) ?? null,
      linkId: typeof body.linkId === "string" ? body.linkId : null,
      linkLabel: typeof body.linkLabel === "string" ? body.linkLabel : null,
    });
    recordBusinessAudit({
      actorUserId: actor.userId,
      module: "Customer",
      action: "sticky-note.create",
      entityId: note.id,
      previousValue: null,
      newValue: stickyNotesService.auditRef(note.id),
      result: "Success",
    });
    return successResponse(note, 201);
  } catch (err) {
    if (typeof err === "object" && err && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    const status = Number((err as { statusCode?: number }).statusCode) || 500;
    return errorResponse(
      status,
      (err as { code?: string }).code || "STICKY_NOTE_CREATE_FAILED",
      err instanceof Error ? err.message : "Failed to create sticky note",
    );
  }
}
