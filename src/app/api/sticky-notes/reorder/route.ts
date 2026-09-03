/**
 * CO-C1-CONTACT-STRATEGY-STICKY-NOTES-007 — owner-scoped drag order.
 */

import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { stickyNotesService } from "@server/services/sticky-notes/sticky-notes.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const actor = requireAccessToken(request);
    const body = (await request.json().catch(() => ({}))) as { orderedIds?: unknown };
    const orderedIds = Array.isArray(body.orderedIds)
      ? body.orderedIds.map((id) => String(id))
      : [];
    await stickyNotesService.reorder(actor.userId, orderedIds);
    return successResponse({ ok: true });
  } catch (err) {
    if (typeof err === "object" && err && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    const status = Number((err as { statusCode?: number }).statusCode) || 500;
    return errorResponse(
      status,
      (err as { code?: string }).code || "STICKY_NOTE_REORDER_FAILED",
      err instanceof Error ? err.message : "Failed to reorder sticky notes",
    );
  }
}
