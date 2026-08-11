/**
 * CO-WP-ACCESS-001A — Partner Deal stage change.
 */
import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
  requirePartnerAccessToken,
  assertTokenPartnerIdentity,
} from "@/lib/api/partner-route-utils";
import { partnerDealService } from "@server/services/partner-gateway/partner-deal.service";
import { PartnerGatewayError } from "@server/services/partner-gateway/partner-binding.service";

type Ctx = { params: Promise<{ dealId: string }> };

export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function POST(request: Request, context: Ctx) {
  try {
    const actor = requirePartnerAccessToken(request);
    const { dealId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      toGrossStage?: string;
      rowVersion?: number;
      reason?: string;
      partnerId?: string;
    };
    assertTokenPartnerIdentity(actor, body.partnerId);
    if (typeof body.rowVersion !== "number" || !body.toGrossStage?.trim()) {
      throw new PartnerGatewayError(
        "toGrossStage and rowVersion are required",
        "VALIDATION",
        400,
      );
    }
    const detail = await partnerDealService.changeStage(
      actor.userId,
      decodeURIComponent(dealId),
      {
        toGrossStage: body.toGrossStage,
        rowVersion: body.rowVersion,
        reason: body.reason,
      },
    );
    return partnerSuccess(request, detail);
  } catch (err) {
    return partnerError(request, err);
  }
}
