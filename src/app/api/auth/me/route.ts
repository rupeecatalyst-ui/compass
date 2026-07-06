import { authService } from "@server/services/auth.service";
import { formatAuthError } from "@server/validators/auth.validators";
import { fromAuthError, requireAccessToken, successResponse } from "@/lib/api/auth-route-utils";

/** ADR-014 — Native auth gateway: current user */
export async function GET(request: Request) {
  try {
    const tokenUser = requireAccessToken(request);
    const profile = await authService.getMe(tokenUser.userId);
    return successResponse(profile);
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "status" in err &&
      "body" in err
    ) {
      const authErr = err as { status: number; body: { success: false; error: { code: string; message: string } } };
      return fromAuthError(authErr);
    }
    return fromAuthError(formatAuthError(err));
  }
}
