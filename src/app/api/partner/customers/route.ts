import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
  requirePartnerAccessToken,
} from "@/lib/api/partner-route-utils";
import { partnerBusinessService } from "@server/services/partner-gateway/partner-business.service";

/** CO-WP-JOURNEY-003 — Partner Customer directory. */
export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function GET(request: Request) {
  try {
    const actor = requirePartnerAccessToken(request);
    const directory = await partnerBusinessService.listCustomerDirectory(actor.userId);
    return partnerSuccess(request, directory);
  } catch (err) {
    return partnerError(request, err);
  }
}
