import { authService } from "@server/services/auth.service";
import { formatAuthError, refreshSchema } from "@server/validators/auth.validators";
import { fromAuthError, successResponse } from "@/lib/api/auth-route-utils";

/** ADR-014 — Native auth gateway: token refresh (session persistence) */
export async function POST(request: Request) {
  try {
    const body = refreshSchema.parse(await request.json());
    const tokens = await authService.refresh(body.refreshToken);
    return successResponse(tokens);
  } catch (err) {
    return fromAuthError(formatAuthError(err));
  }
}
