import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
  requirePartnerAccessToken,
} from "@/lib/api/partner-route-utils";
import { partnerOpportunityJourneyConfigService } from "@server/services/partner-gateway/partner-opportunity-journey-config.service";

/** CO-WP-JOURNEY-001C — Enterprise Opportunity Journey configuration for Partner App. */
export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function GET(request: Request) {
  try {
    requirePartnerAccessToken(request);
    const config = partnerOpportunityJourneyConfigService.getConfig();
    return partnerSuccess(request, config);
  } catch (err) {
    return partnerError(request, err);
  }
}
