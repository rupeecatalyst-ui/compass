/**
 * Authenticated directory of ACTIVE Enterprise User Registry accounts
 * for Opportunity / Deal assignment pickers.
 *
 * Any signed-in user may read this list (assignment is gated in the registry UI).
 * No role / branch / eligibility filters beyond isActive.
 */
import {
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { formatAuthError } from "@server/validators/auth.validators";
import { userAdminService } from "@server/services/user-admin.service";

export async function GET(request: Request) {
  try {
    requireAccessToken(request);
    const url = new URL(request.url);
    const users = await userAdminService.listAssignable({
      search: url.searchParams.get("search") ?? undefined,
      authorised:
        url.searchParams.get("authorised") === "1" ||
        url.searchParams.get("authorised") === "true",
    });
    return successResponse({ users });
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return fromAuthError(formatAuthError(err));
  }
}
