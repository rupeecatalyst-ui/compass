/**
 * Resolve supervisors above assigned users (reportingManagerId chain).
 * Used when persisting Opportunity / Deal assignment visibility.
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
    const raw = url.searchParams.get("userIds") ?? "";
    const userIds = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const ancestorUserIds = await userAdminService.resolveHierarchyAncestors(userIds);
    return successResponse({ ancestorUserIds });
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return fromAuthError(formatAuthError(err));
  }
}
