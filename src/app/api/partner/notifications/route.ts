import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
  requirePartnerAccessToken,
} from "@/lib/api/partner-route-utils";
import { partnerNotificationCenterService } from "@server/services/partner-gateway/partner-notification-center.service";
import { runWithPartnerRequestMemo } from "@server/services/partner-gateway/partner-request-memo";

/** CO-WP-NOTIFY-001 — Enterprise Notification Center */
export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function GET(request: Request) {
  const started = Date.now();
  try {
    const actor = requirePartnerAccessToken(request);
    const center = await runWithPartnerRequestMemo(() =>
      partnerNotificationCenterService.getCenter(actor.userId),
    );
    const res = partnerSuccess(request, center);
    res.headers.set("Server-Timing", `total;dur=${Date.now() - started}`);
    return res;
  } catch (err) {
    return partnerError(request, err);
  }
}

export async function POST(request: Request) {
  const started = Date.now();
  try {
    const actor = requirePartnerAccessToken(request);
    const body = (await request.json().catch(() => ({}))) as { action?: string };
    if (body.action === "mark_all_read") {
      const center = await runWithPartnerRequestMemo(() =>
        partnerNotificationCenterService.markAllRead(actor.userId),
      );
      const res = partnerSuccess(request, center);
      res.headers.set("Server-Timing", `total;dur=${Date.now() - started}`);
      return res;
    }
    const { PartnerGatewayError } = await import(
      "@server/services/partner-gateway/partner-binding.service"
    );
    throw new PartnerGatewayError("Unsupported action", "BAD_REQUEST", 400);
  } catch (err) {
    return partnerError(request, err);
  }
}
