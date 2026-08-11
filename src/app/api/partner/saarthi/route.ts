/**
 * CO-WP-EXP-001 — Partner Saarthi desk.
 */
import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
  requirePartnerAccessToken,
} from "@/lib/api/partner-route-utils";
import { partnerSaarthiService } from "@server/services/partner-gateway/partner-saarthi.service";

export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function GET(request: Request) {
  try {
    const actor = requirePartnerAccessToken(request);
    const desk = await partnerSaarthiService.getDesk(actor.userId);
    return partnerSuccess(request, desk);
  } catch (err) {
    return partnerError(request, err);
  }
}
