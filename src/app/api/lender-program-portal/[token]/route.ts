/**
 * CO-LEND-001 — Public resolve invite by token.
 */
import { errorResponse, successResponse } from "@/lib/api/auth-route-utils";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { lenderProgramPortalService } from "@server/services/lender-program-portal/lender-program-portal.service";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  try {
    if (!isEnterprisePersistencePrisma()) {
      return errorResponse(503, "PERSISTENCE_REQUIRED", "Requires prisma mode");
    }
    const { token } = await ctx.params;
    const data = await lenderProgramPortalService.resolveToken(
      decodeURIComponent(token),
    );
    return successResponse(data);
  } catch (err) {
    const e = err as { statusCode?: number; code?: string; message?: string };
    return errorResponse(
      e.statusCode || 500,
      e.code || "LENDER_PROGRAM_PORTAL_ERROR",
      e.message || "Invalid link",
    );
  }
}
