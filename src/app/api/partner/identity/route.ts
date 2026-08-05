import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
  requirePartnerAccessToken,
} from "@/lib/api/partner-route-utils";
import { partnerIdentityModuleService } from "@server/services/partner-gateway/partner-identity.service";

/** CO-WP-IDENTITY-002 — Expanded Identity Module */
export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function GET(request: Request) {
  try {
    const actor = requirePartnerAccessToken(request);
    const identityModule = await partnerIdentityModuleService.getIdentityModule(actor.userId);
    return partnerSuccess(request, identityModule);
  } catch (err) {
    return partnerError(request, err);
  }
}
