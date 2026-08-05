import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
  requirePartnerAccessToken,
} from "@/lib/api/partner-route-utils";
import { partnerBusinessService } from "@server/services/partner-gateway/partner-business.service";

/** CO-WP-DEVELOPMENT-WAVE-001 — Partner customer search (placeholder). */
export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function GET(request: Request) {
  try {
    const actor = requirePartnerAccessToken(request);
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? "";
    const customers = await partnerBusinessService.searchCustomers(actor.userId, q);
    return partnerSuccess(request, { customers });
  } catch (err) {
    return partnerError(request, err);
  }
}
