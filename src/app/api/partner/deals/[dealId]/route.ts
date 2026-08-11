/**
 * CO-WP-ACCESS-001A — Partner Deal detail / edit.
 */
import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
  requirePartnerAccessToken,
  assertTokenPartnerIdentity,
} from "@/lib/api/partner-route-utils";
import { partnerDealService } from "@server/services/partner-gateway/partner-deal.service";

type Ctx = { params: Promise<{ dealId: string }> };

export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function GET(request: Request, context: Ctx) {
  try {
    const actor = requirePartnerAccessToken(request);
    const { dealId } = await context.params;
    const detail = await partnerDealService.getDeal(actor.userId, decodeURIComponent(dealId));
    return partnerSuccess(request, detail);
  } catch (err) {
    return partnerError(request, err);
  }
}

export async function PATCH(request: Request, context: Ctx) {
  try {
    const actor = requirePartnerAccessToken(request);
    const { dealId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      productLabel?: string;
      notes?: string;
      rowVersion?: number;
      partnerId?: string;
    };
    assertTokenPartnerIdentity(actor, body.partnerId);
    if (typeof body.rowVersion !== "number") {
      return partnerError(
        request,
        Object.assign(new Error("rowVersion is required"), {
          statusCode: 400,
          code: "VALIDATION",
        }),
      );
    }
    const detail = await partnerDealService.patchDeal(
      actor.userId,
      decodeURIComponent(dealId),
      {
        productLabel: body.productLabel,
        notes: body.notes,
        rowVersion: body.rowVersion,
      },
    );
    return partnerSuccess(request, detail);
  } catch (err) {
    return partnerError(request, err);
  }
}
