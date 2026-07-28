/**
 * CO-LEND-001 — Verify dual OTP (email + mobile).
 */
import { errorResponse, successResponse } from "@/lib/api/auth-route-utils";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { lenderProgramPortalService } from "@server/services/lender-program-portal/lender-program-portal.service";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  try {
    if (!isEnterprisePersistencePrisma()) {
      return errorResponse(503, "PERSISTENCE_REQUIRED", "Requires prisma mode");
    }
    const { token } = await ctx.params;
    const body = (await request.json()) as {
      code?: string;
      emailCode?: string;
      mobileCode?: string;
    };
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
    const challenge =
      body.emailCode?.trim() && body.mobileCode?.trim()
        ? { emailCode: body.emailCode.trim(), mobileCode: body.mobileCode.trim() }
        : body.code?.trim();
    if (!challenge) {
      return errorResponse(
        400,
        "VALIDATION",
        "Email OTP and Mobile OTP are required",
      );
    }
    const data = await lenderProgramPortalService.verifyOtp(
      decodeURIComponent(token),
      challenge,
      ip,
    );
    return successResponse(data);
  } catch (err) {
    const e = err as { statusCode?: number; code?: string; message?: string };
    return errorResponse(
      e.statusCode || 500,
      e.code || "LENDER_PROGRAM_PORTAL_ERROR",
      e.message || "OTP verification failed",
    );
  }
}
