/**
 * CO-WP-EXP-001 — Partner Marketing / Resources.
 */
import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
  requirePartnerAccessToken,
} from "@/lib/api/partner-route-utils";
import { partnerMarketingService } from "@server/services/partner-gateway/partner-marketing.service";

export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function GET(request: Request) {
  try {
    const actor = requirePartnerAccessToken(request);
    const desk = await partnerMarketingService.getDesk(actor.userId);
    return partnerSuccess(request, desk);
  } catch (err) {
    return partnerError(request, err);
  }
}
