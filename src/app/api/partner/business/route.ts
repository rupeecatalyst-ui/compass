import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
  requirePartnerAccessToken,
} from "@/lib/api/partner-route-utils";
import { partnerBusinessService } from "@server/services/partner-gateway/partner-business.service";

/** CO-WP-DEVELOPMENT-WAVE-001 — Partner Business hub (placeholder DTO). */
export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function GET(request: Request) {
  try {
    const actor = requirePartnerAccessToken(request);
    const hub = await partnerBusinessService.getHub(actor.userId);
    return partnerSuccess(request, hub);
  } catch (err) {
    return partnerError(request, err);
  }
}
