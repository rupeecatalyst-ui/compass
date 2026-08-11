/**
 * CO-NOTIFICATION-001 — Enterprise Notifications API (Catalyst One users).
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { enterpriseNotificationService } from "@server/services/enterprise-notification/enterprise-notification.service";

export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    const url = new URL(request.url);
    const items = await enterpriseNotificationService.listForUser({
      userId: actor.userId,
      limit: Number(url.searchParams.get("limit") ?? "40") || 40,
      since: url.searchParams.get("since") ?? undefined,
      unreadOnly: url.searchParams.get("unreadOnly") === "1",
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
      (err as { code?: string }).code || "ENE_ERROR",
      err instanceof Error ? err.message : "Failed to list notifications",
    );
  }
}
