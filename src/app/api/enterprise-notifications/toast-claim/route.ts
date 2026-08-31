/**
 * Claim unpresented bottom-right toast notifications for the authenticated recipient.
 * Marks toastPresentedAt before returning. Does not change read/unread.
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { ENE_TOAST_CLAIM_LIMIT } from "@/constants/enterprise-notification-engine";
import { enterpriseNotificationService } from "@server/services/enterprise-notification/enterprise-notification.service";

export async function POST(request: Request) {
  try {
    const actor = requireAccessToken(request);
    const body = (await request.json().catch(() => ({}))) as { limit?: number };
    const items = await enterpriseNotificationService.claimPendingToastsForUser({
      userId: actor.userId,
      limit: Number(body.limit) || ENE_TOAST_CLAIM_LIMIT,
    });
    return successResponse({
      items,
      durable: enterpriseNotificationService.isDurable(),
    });
  } catch (err) {
    const e = err as { status?: number; statusCode?: number };
    if (e.status === 401 || e.statusCode === 401) return fromAuthError(err as never);
    return errorResponse(
      (err as { statusCode?: number }).statusCode || 500,
      (err as { code?: string }).code || "ENE_TOAST_CLAIM_ERROR",
      err instanceof Error ? err.message : "Failed to claim toast notifications",
    );
  }
}
