/**
 * GET /api/users/downline — actor + transitive reportees (reportingManagerId BFS).
 * Used by CHANAKYA Radar / client visibility filters.
 */
import {
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { formatAuthError } from "@server/validators/auth.validators";
import { userAdminService } from "@server/services/user-admin.service";
import { hasOrgWideCaseVisibility } from "@/lib/enterprise-case-visibility";

export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    const url = new URL(request.url);
    const requested = url.searchParams.get("userId")?.trim() || actor.userId;
    // Non-org-wide actors may only resolve their own downline.
    const targetUserId =
      requested === actor.userId || hasOrgWideCaseVisibility(actor.role)
        ? requested
        : actor.userId;
    const downlineUserIds =
      await userAdminService.resolveDownlineUserIds(targetUserId);
    return successResponse({
      userId: targetUserId,
      downlineUserIds,
    });
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return fromAuthError(formatAuthError(err));
  }
}
