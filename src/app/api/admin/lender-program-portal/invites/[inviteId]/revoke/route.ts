/**
 * CO-LEND-001 — Revoke portal invite.
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
  ctx: { params: Promise<{ inviteId: string }> },
) {
  try {
    if (!isEnterprisePersistencePrisma()) {
      return errorResponse(503, "PERSISTENCE_REQUIRED", "Requires prisma mode");
    }
    const actor = requireAccessToken(request);
    const { inviteId } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    const invite = await lenderProgramPortalService.revokeInvite(
      inviteId,
      actor.email || actor.userId,
      body.reason,
    );
    return successResponse(invite);
  } catch (err) {
    const e = err as { statusCode?: number; code?: string; message?: string };
    if (e.statusCode === 401) return fromAuthError(err as never);
    return errorResponse(
      e.statusCode || 500,
      e.code || "LENDER_PROGRAM_PORTAL_ERROR",
      e.message || "Failed to revoke invite",
    );
  }
}
