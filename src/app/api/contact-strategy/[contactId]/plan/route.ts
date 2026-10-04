/**
 * CO-C1-CONTACT-STRATEGY-STICKY-NOTES-007 — relationship plan bound to ECM Contact.
 */

import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { recordBusinessAudit } from "@/lib/ops/record";
import { upsertContactRelationshipPlan } from "@server/services/contact-strategy/contact-strategy.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ contactId: string }> },
) {
  try {
    const actor = requireAccessToken(request);
    const { contactId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const plan = await upsertContactRelationshipPlan({
      actorUserId: actor.userId,
      actorLabel: actor.email ? "RC employee" : "RC employee",
      contactId,
      objective: typeof body.objective === "string" ? body.objective : null,
      cadence: typeof body.cadence === "string" ? body.cadence : null,
      preferredChannel: typeof body.preferredChannel === "string" ? body.preferredChannel : null,
      nextReviewAt: typeof body.nextReviewAt === "string" ? body.nextReviewAt : null,
      assignedOwnerUserId:
        typeof body.assignedOwnerUserId === "string" ? body.assignedOwnerUserId : actor.userId,
      assignedOwnerName:
        typeof body.assignedOwnerName === "string" ? body.assignedOwnerName : null,
    });
    recordBusinessAudit({
      actorUserId: actor.userId,
      module: "Customer",
      action: "contact-strategy.plan.upsert",
      entityId: contactId,
      previousValue: null,
      newValue: "relationship-plan",
      result: "Success",
    });
    return successResponse(plan);
  } catch (err) {
    if (typeof err === "object" && err && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    const status = Number((err as { statusCode?: number }).statusCode) || 500;
    return errorResponse(
      status,
      (err as { code?: string }).code || "CONTACT_STRATEGY_PLAN_FAILED",
      err instanceof Error ? err.message : "Failed to save relationship plan",
    );
  }
}
