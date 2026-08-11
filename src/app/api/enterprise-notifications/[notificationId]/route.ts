/**
 * CO-NOTIFICATION-001 — Mark notification read (Catalyst One).
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { enterpriseNotificationService } from "@server/services/enterprise-notification/enterprise-notification.service";

export async function POST(
  request: Request,
  context: { params: Promise<{ notificationId: string }> },
) {
  try {
    const actor = requireAccessToken(request);
    const { notificationId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { action?: string };
    if (body.action && body.action !== "mark_read") {
      return errorResponse(400, "VALIDATION", "Unsupported action");
    }
    const item = await enterpriseNotificationService.markReadForUser({
      id: notificationId,
      userId: actor.userId,
    });
    if (!item) return errorResponse(404, "NOT_FOUND", "Notification not found");
    return successResponse({ item });
  } catch (err) {
    const e = err as { status?: number; statusCode?: number };
    if (e.status === 401 || e.statusCode === 401) return fromAuthError(err as never);
    return errorResponse(
      (err as { statusCode?: number }).statusCode || 500,
      (err as { code?: string }).code || "ENE_ERROR",
      err instanceof Error ? err.message : "Failed to update notification",
    );
  }
}
