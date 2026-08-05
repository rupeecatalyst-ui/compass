import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
  requirePartnerAccessToken,
} from "@/lib/api/partner-route-utils";
import { partnerOpportunityRecommendationsService } from "@server/services/partner-gateway/partner-opportunity-recommendations.service";

type Ctx = { params: Promise<{ opportunityId: string }> };

/**
 * CO-WP-REC-001 — Catalyst One Recommendation Engine projection for Catalyst Connect.
 * Customer-friendly cards only — no credit/risk/policy internals.
 */
export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function GET(request: Request, context: Ctx) {
  try {
    const actor = requirePartnerAccessToken(request);
    const { opportunityId } = await context.params;
    const dto = await partnerOpportunityRecommendationsService.getRecommendations(
      actor.userId,
      decodeURIComponent(opportunityId),
    );
    return partnerSuccess(request, dto);
  } catch (err) {
    return partnerError(request, err);
  }
}
