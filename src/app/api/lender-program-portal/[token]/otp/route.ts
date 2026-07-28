/**
 * CO-LEND-001 — Request OTP for lender verifier.
 */
import { errorResponse, successResponse } from "@/lib/api/auth-route-utils";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { lenderProgramPortalService } from "@server/services/lender-program-portal/lender-program-portal.service";
import type { LenderProgramVerifier } from "@/types/lender-program-portal";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  try {
    if (!isEnterprisePersistencePrisma()) {
      return errorResponse(503, "PERSISTENCE_REQUIRED", "Requires prisma mode");
    }
    const { token } = await ctx.params;
    const verifier = (await request.json()) as LenderProgramVerifier;
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      undefined;
    const data = await lenderProgramPortalService.requestOtp(
      decodeURIComponent(token),
      verifier,
      ip,
    );
    return successResponse(data);
  } catch (err) {
    const e = err as { statusCode?: number; code?: string; message?: string };
    return errorResponse(
      e.statusCode || 500,
      e.code || "LENDER_PROGRAM_PORTAL_ERROR",
      e.message || "OTP request failed",
    );
  }
}
