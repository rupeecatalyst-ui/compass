import { authService } from "@server/services/auth.service";
import { forgotPasswordSchema, formatAuthError } from "@server/validators/auth.validators";
import { fromAuthError, successResponse } from "@/lib/api/auth-route-utils";

/** ADR-014 / CO-BUG-117 — Native auth gateway: forgot password */
export async function POST(request: Request) {
  try {
    const body = forgotPasswordSchema.parse(await request.json());
    const result = await authService.forgotPassword(body.email);
    return successResponse(result);
  } catch (err) {
    const formatted = formatAuthError(err);
    return fromAuthError(formatted);
  }
}
