import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
  requirePartnerAccessToken,
} from "@/lib/api/partner-route-utils";
import { partnerBusinessService } from "@server/services/partner-gateway/partner-business.service";

/**
 * CO-WP-SEARCH-001 — Unified Partner Global Search.
 * Customers · Opportunities · Documents — Catalyst One SSOT only.
 */
export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function GET(request: Request) {
  try {
    const actor = requirePartnerAccessToken(request);
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? "";
    const result = await partnerBusinessService.searchEnterprise(actor.userId, q);
    return partnerSuccess(request, result);
  } catch (err) {
    return partnerError(request, err);
  }
}
