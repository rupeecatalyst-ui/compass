import { authService } from "@server/services/auth.service";
import { formatAuthError, loginSchema } from "@server/validators/auth.validators";
import { fromAuthError, successResponse } from "@/lib/api/auth-route-utils";

/** ADR-014 — Native auth gateway: login */
export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const result = await authService.login(body.email, body.password);
    return successResponse(result);
  } catch (err) {
    const formatted = formatAuthError(err);
    return fromAuthError(formatted);
  }
}
