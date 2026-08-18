import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
  requirePartnerAccessToken,
} from "@/lib/api/partner-route-utils";
import { PartnerGatewayError } from "@server/services/partner-gateway/partner-auth.service";
import { partnerOpportunityLendersService } from "@server/services/partner-gateway/partner-opportunity-lenders.service";

type Ctx = { params: Promise<{ opportunityId: string }> };

/**
 * CO-WP-REC-002 — Partner selected lenders (Enterprise Deal Registry).
 * Never expose employee lender-registry or Deal admin APIs to the partner browser.
 */
export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function GET(request: Request, context: Ctx) {
  try {
    const actor = requirePartnerAccessToken(request);
    const { opportunityId } = await context.params;
    const dto = await partnerOpportunityLendersService.listSelected(
      actor.userId,
      decodeURIComponent(opportunityId),
    );
    return partnerSuccess(request, dto);
  } catch (err) {
    return partnerError(request, err);
  }
}

export async function POST(request: Request, context: Ctx) {
  try {
    const actor = requirePartnerAccessToken(request);
    const { opportunityId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      lenderId?: string;
      source?: string;
      reason?: string;
      displayName?: string;
    };
    if (body.displayName && !body.lenderId) {
      throw new PartnerGatewayError(
        "Select a lender from the Enterprise Lender Registry.",
        "VALIDATION",
        400,
      );
    }
    const dto = await partnerOpportunityLendersService.selectLender(
      actor.userId,
      decodeURIComponent(opportunityId),
      {
        lenderId: body.lenderId,
        source: body.source,
        reason: body.reason,
      },
    );
    return partnerSuccess(request, dto);
  } catch (err) {
    return partnerError(request, err);
  }
}
