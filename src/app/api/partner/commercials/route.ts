/**
 * CO-WP-COM-001 — Partner Commercials desk.
 */
import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
  requirePartnerAccessToken,
} from "@/lib/api/partner-route-utils";
import { partnerCommercialsService } from "@server/services/partner-gateway/partner-commercials.service";

export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function GET(request: Request) {
  try {
    const actor = requirePartnerAccessToken(request);
    const desk = await partnerCommercialsService.getCommercialsDesk(actor.userId);
    return partnerSuccess(request, desk);
  } catch (err) {
    return partnerError(request, err);
  }
}
