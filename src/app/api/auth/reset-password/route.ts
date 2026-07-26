import { authService } from "@server/services/auth.service";
import { formatAuthError, resetPasswordSchema } from "@server/validators/auth.validators";
import { fromAuthError, successResponse } from "@/lib/api/auth-route-utils";

/** ADR-014 / CO-BUG-117 — Native auth gateway: reset password */
export async function POST(request: Request) {
  try {
    const body = resetPasswordSchema.parse(await request.json());
    if (body.password !== body.confirmPassword) {
      return fromAuthError({
        status: 400,
        body: {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Passwords do not match",
          },
        },
      });
    }
    const result = await authService.resetPassword(body.token, body.password);
    return successResponse(result);
  } catch (err) {
    const formatted = formatAuthError(err);
    return fromAuthError(formatted);
  }
}
