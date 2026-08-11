/**
 * CO-WP-ACCESS-001A — Partner Deals list / create surface.
 */
import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
  requirePartnerAccessToken,
} from "@/lib/api/partner-route-utils";
import { partnerDealService } from "@server/services/partner-gateway/partner-deal.service";

export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function GET(request: Request) {
  try {
    const actor = requirePartnerAccessToken(request);
    const deals = await partnerDealService.listDeals(actor.userId);
    return partnerSuccess(request, { deals });
  } catch (err) {
    return partnerError(request, err);
  }
}
