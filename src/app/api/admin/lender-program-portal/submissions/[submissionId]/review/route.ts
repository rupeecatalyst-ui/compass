/**
 * CO-LEND-001 — Admin review / publish submission.
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { lenderProgramPortalService } from "@server/services/lender-program-portal/lender-program-portal.service";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ submissionId: string }> },
) {
  try {
    if (!isEnterprisePersistencePrisma()) {
      return errorResponse(503, "PERSISTENCE_REQUIRED", "Requires prisma mode");
    }
    const actor = requireAccessToken(request);
    const { submissionId } = await ctx.params;
    const body = (await request.json()) as {
      action?: "approve" | "reject" | "clarify" | "publish" | "schedule" | "save_draft";
      comments?: string;
      clarificationNotes?: string;
      rejectionReason?: string;
      schedulePublishAt?: string;
    };
    if (!body.action) {
      return errorResponse(400, "VALIDATION", "action is required");
    }
    const item = await lenderProgramPortalService.reviewSubmission(submissionId, {
      action: body.action,
      comments: body.comments,
      clarificationNotes: body.clarificationNotes,
      rejectionReason: body.rejectionReason,
      schedulePublishAt: body.schedulePublishAt,
      actorUserId: actor.userId,
      actorName: actor.email || actor.userId,
    });
    return successResponse(item);
  } catch (err) {
    const e = err as { statusCode?: number; code?: string; message?: string };
    if (e.statusCode === 401) return fromAuthError(err as never);
    return errorResponse(
      e.statusCode || 500,
      e.code || "LENDER_PROGRAM_PORTAL_ERROR",
      e.message || "Review failed",
    );
  }
}
