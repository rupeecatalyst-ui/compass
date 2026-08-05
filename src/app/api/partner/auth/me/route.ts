import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
  requirePartnerAccessToken,
} from "@/lib/api/partner-route-utils";
import { partnerAuthService } from "@server/services/partner-gateway/partner-auth.service";

/** CO-WP-102 — Partner session identity (no business registries). */
export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function GET(request: Request) {
  try {
    const actor = requirePartnerAccessToken(request);
    const session = await partnerAuthService.me(actor.userId, actor.partnerId);
    return partnerSuccess(request, session);
  } catch (err) {
    return partnerError(request, err);
  }
}
