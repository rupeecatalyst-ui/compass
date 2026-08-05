import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
  requirePartnerAccessToken,
} from "@/lib/api/partner-route-utils";
import { partnerBusinessService } from "@server/services/partner-gateway/partner-business.service";

type Ctx = { params: Promise<{ opportunityId: string }> };

export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function POST(request: Request, context: Ctx) {
  try {
    const actor = requirePartnerAccessToken(request);
    const { opportunityId } = await context.params;
    const detail = await partnerBusinessService.submitOpportunity(actor.userId, opportunityId);
    return partnerSuccess(request, detail);
  } catch (err) {
    return partnerError(request, err);
  }
}
