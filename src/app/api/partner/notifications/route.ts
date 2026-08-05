import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
  requirePartnerAccessToken,
} from "@/lib/api/partner-route-utils";
import { partnerNotificationCenterService } from "@server/services/partner-gateway/partner-notification-center.service";

/** CO-WP-NOTIFY-001 — Enterprise Notification Center */
export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function GET(request: Request) {
  try {
    const actor = requirePartnerAccessToken(request);
    const center = await partnerNotificationCenterService.getCenter(actor.userId);
    return partnerSuccess(request, center);
  } catch (err) {
    return partnerError(request, err);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requirePartnerAccessToken(request);
    const body = (await request.json().catch(() => ({}))) as { action?: string };
    if (body.action === "mark_all_read") {
      const center = await partnerNotificationCenterService.markAllRead(actor.userId);
      return partnerSuccess(request, center);
    }
    const { PartnerGatewayError } = await import(
      "@server/services/partner-gateway/partner-binding.service"
    );
    throw new PartnerGatewayError("Unsupported action", "BAD_REQUEST", 400);
  } catch (err) {
    return partnerError(request, err);
  }
}
