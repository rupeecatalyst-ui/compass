import { authService } from "@server/services/auth.service";
import { changePasswordSchema, formatAuthError } from "@server/validators/auth.validators";
import { fromAuthError, requireAccessToken, successResponse } from "@/lib/api/auth-route-utils";

/** Authenticated password change — required on first login when mustChangePassword is set. */
export async function POST(request: Request) {
  try {
    const payload = requireAccessToken(request);
    const body = changePasswordSchema.parse(await request.json());
    const result = await authService.changePassword(
      payload.userId,
      body.currentPassword,
      body.newPassword,
    );
    return successResponse(result);
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
