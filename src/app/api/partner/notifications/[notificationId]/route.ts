import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
  requirePartnerAccessToken,
} from "@/lib/api/partner-route-utils";
import { partnerNotificationCenterService } from "@server/services/partner-gateway/partner-notification-center.service";
import { PartnerGatewayError } from "@server/services/partner-gateway/partner-binding.service";
import { runWithPartnerRequestMemo } from "@server/services/partner-gateway/partner-request-memo";

type Ctx = { params: Promise<{ notificationId: string }> };

/** CO-WP-NOTIFY-001 — Mark one notification read */
export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function POST(request: Request, context: Ctx) {
  try {
    const actor = requirePartnerAccessToken(request);
    const { notificationId } = await context.params;
    if (!notificationId?.trim()) {
      throw new PartnerGatewayError("notificationId required", "BAD_REQUEST", 400);
    }
    const body = (await request.json().catch(() => ({}))) as { action?: string };
    if (body.action && body.action !== "mark_read") {
      throw new PartnerGatewayError("Unsupported action", "BAD_REQUEST", 400);
    }
    const center = await runWithPartnerRequestMemo(() =>
      partnerNotificationCenterService.markRead(actor.userId, notificationId.trim()),
    );
    return partnerSuccess(request, center);
  } catch (err) {
    return partnerError(request, err);
  }
}
