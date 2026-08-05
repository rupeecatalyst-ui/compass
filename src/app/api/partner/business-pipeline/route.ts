import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
  requirePartnerAccessToken,
} from "@/lib/api/partner-route-utils";
import { partnerBusinessService } from "@server/services/partner-gateway/partner-business.service";

/** CO-WP-BUSINESS-001 — My Business Pipeline Workspace. */
export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function GET(request: Request) {
  try {
    const actor = requirePartnerAccessToken(request);
    const pipeline = await partnerBusinessService.getBusinessPipeline(actor.userId);
    return partnerSuccess(request, pipeline);
  } catch (err) {
    return partnerError(request, err);
  }
}
