import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
  requirePartnerAccessToken,
} from "@/lib/api/partner-route-utils";
import { partnerBusinessService } from "@server/services/partner-gateway/partner-business.service";
import type { PartnerOpportunityPatchInput } from "@/types/enterprise-partner-business";

type Ctx = { params: Promise<{ opportunityId: string }> };

export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function GET(request: Request, context: Ctx) {
  try {
    const actor = requirePartnerAccessToken(request);
    const { opportunityId } = await context.params;
    const detail = await partnerBusinessService.getOpportunity(
      actor.userId,
      decodeURIComponent(opportunityId),
    );
    return partnerSuccess(request, detail);
  } catch (err) {
    return partnerError(request, err);
  }
}

export async function PATCH(request: Request, context: Ctx) {
  try {
    const actor = requirePartnerAccessToken(request);
    const { opportunityId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as PartnerOpportunityPatchInput;
    const detail = await partnerBusinessService.patchOpportunity(
      actor.userId,
      decodeURIComponent(opportunityId),
      body,
    );
    return partnerSuccess(request, detail);
  } catch (err) {
    return partnerError(request, err);
  }
}
